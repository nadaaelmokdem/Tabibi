using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Tabibi.Models;

namespace Tabibi.Services.Payments
{
    public class GeideaPaymentStrategy : IPaymentGatewayStrategy
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly string _baseUrl;
        private readonly string _checkoutUrl;
        private readonly string _merchantPublicKey;
        private readonly string _apiPassword;

        public GeideaPaymentStrategy(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _merchantPublicKey = _configuration["Payment:APIKey"] ?? "";
            _apiPassword = _configuration["Payment:SecretKey"] ?? "";
            _baseUrl = _configuration["Payment:BaseUrl"] ?? "https://api.merchant.geidea.net/payment-intent/api/v2/direct/session";
            _checkoutUrl = _configuration["Payment:CheckoutUrl"] ?? "https://www.merchant.geidea.net/hpp/checkout/?";
        }

        public async Task<string> GeneratePaymentLinkAsync(Payment payment, Appointment appointment)
        {
            var orderId = $"GEID-{payment.PaymentId}-{DateTime.UtcNow.Ticks}";
            payment.ExternalOrderId = orderId;

            string amountStr = payment.Amount.ToString("0.00", CultureInfo.InvariantCulture);
            string currency = "EGP";
            string timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");

            string signature = GenerateSignature(_merchantPublicKey, amountStr, currency, orderId, _apiPassword, timestamp);

            var baseReturnUrl = _configuration["Payment:ReturnUrl"]?.TrimEnd('/') ?? "http://localhost:5173";

            var requestBody = new
            {
                amount = decimal.Parse(amountStr, CultureInfo.InvariantCulture),
                currency = currency,
                timestamp = timestamp,
                merchantReferenceId = orderId,
                signature = signature,
                callbackUrl = _configuration["Payment:WebhookUrl"] ?? "http://localhost:5009/api/Payment/webhook/Geidea",
                returnUrl = $"{baseReturnUrl}/payment-result?sessionId={appointment.SessionId}&type={(appointment.ConsultationType == ConsultationType.VideoCall ? "video" : "chat")}",
                language = "en",
                paymentOperation = "Pay",
                customer = new
                {
                    email = appointment.Patient?.User?.Email ?? "patient@example.com",
                    phoneNumber = appointment.Patient?.User?.PhoneNumber ?? "0000000000",
                    firstName = appointment.Patient?.User?.FullName ?? "Patient",
                    lastName = "Name"
                }
            };

            var request = new HttpRequestMessage(HttpMethod.Post, _baseUrl);
            var authString = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_merchantPublicKey}:{_apiPassword}"));
            request.Headers.Add("Authorization", $"Basic {authString}");
            request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            try
            {
                var response = await _httpClient.SendAsync(request);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    string errorMessage = $"Status: {response.StatusCode}";
                    try
                    {
                        using var errorJson = JsonDocument.Parse(responseContent);
                        if (errorJson.RootElement.TryGetProperty("detailedResponseMessage", out var messageElement))
                        {
                            errorMessage = messageElement.GetString() ?? errorMessage;
                        }
                    }
                    catch { }

                    throw new InvalidOperationException($"Geidea Payment Gateway Error: {errorMessage}. Payload: {responseContent}");
                }

                using var jsonDocument = JsonDocument.Parse(responseContent);
                var root = jsonDocument.RootElement;
                if (root.TryGetProperty("responseCode", out var responseCodeElement) && responseCodeElement.GetString() == "000")
                {
                    if (root.TryGetProperty("session", out var sessionElement) && sessionElement.TryGetProperty("id", out var sessionIdElement))
                    {
                        var sessionId = sessionIdElement.GetString();
                        return $"{_checkoutUrl}{sessionId}";
                    }
                }

                string detailError = "Unknown error";
                if (root.TryGetProperty("detailedResponseMessage", out var detailedMessage))
                {
                    detailError = detailedMessage.GetString() ?? "Unknown error";
                }
                throw new InvalidOperationException($"Geidea response failed: {detailError}");
            }
            catch (HttpRequestException ex)
            {
                throw new InvalidOperationException($"Failed to connect to Geidea Payment Gateway: {ex.Message}");
            }
        }

        private string GenerateSignature(string merchantPublicKey, string amountStr, string currency, string merchantReferenceId, string apiPassword, string timestamp)
        {
            var data = $"{merchantPublicKey}{amountStr}{currency}{merchantReferenceId}{timestamp}";
            using var hmacSha256 = new HMACSHA256(Encoding.UTF8.GetBytes(apiPassword));
            var hash = hmacSha256.ComputeHash(Encoding.UTF8.GetBytes(data));
            return Convert.ToBase64String(hash);
        }

        private string GenerateWebhookSignature(string merchantPublicKey, string amountStr, string currency, string orderId, string status, string merchantReferenceId, string apiPassword, string timestamp)
        {
            var data = $"{merchantPublicKey}{amountStr}{currency}{orderId}{status}{merchantReferenceId}{timestamp}";
            using var hmacSha256 = new HMACSHA256(Encoding.UTF8.GetBytes(apiPassword));
            var hash = hmacSha256.ComputeHash(Encoding.UTF8.GetBytes(data));
            return Convert.ToBase64String(hash);
        }

        public Task<bool> ValidateWebhookSignatureAsync(string payload, string signature)
        {
            try
            {
                using var jsonDocument = JsonDocument.Parse(payload);
                var root = jsonDocument.RootElement;
                
                var orderElement = root.TryGetProperty("order", out var ord) ? ord : root;
                
                var orderId = orderElement.TryGetProperty("orderId", out var oid) ? oid.GetString() : null;
                var externalOrderId = orderElement.TryGetProperty("merchantReferenceId", out var ext) ? ext.GetString() : null;
                var amount = orderElement.TryGetProperty("amount", out var am) ? am.GetDecimal() : 0m;
                var currency = orderElement.TryGetProperty("currency", out var curr) ? curr.GetString() : "EGP";
                var status = orderElement.TryGetProperty("status", out var st) ? st.GetString() : null;
                var detailedStatus = orderElement.TryGetProperty("detailedStatus", out var dst) ? dst.GetString() : null;
                
                var timestamp = root.TryGetProperty("timeStamp", out var ts1) ? ts1.GetString() : (root.TryGetProperty("timestamp", out var ts2) ? ts2.GetString() : null);
                var payloadSignature = root.TryGetProperty("signature", out var sig) ? sig.GetString() : null;
                var actualSignature = !string.IsNullOrEmpty(signature) ? signature : payloadSignature;
                
                bool isFailedState = status == "Failed" || status == "Cancelled" || detailedStatus == "Cancelled";

                if (string.IsNullOrEmpty(actualSignature) || string.IsNullOrEmpty(timestamp))
                    return Task.FromResult(isFailedState);
                    
                string amountStr = amount.ToString("0.00", CultureInfo.InvariantCulture);
                string expectedSignature = GenerateWebhookSignature(_merchantPublicKey, amountStr, currency, orderId, status, externalOrderId, _apiPassword, timestamp);
                if (actualSignature == expectedSignature) return Task.FromResult(true);

                string expectedSignature2 = GenerateWebhookSignature(_merchantPublicKey, amountStr, currency, orderId, detailedStatus, externalOrderId, _apiPassword, timestamp);
                if (actualSignature == expectedSignature2) return Task.FromResult(true);

                return Task.FromResult(isFailedState);
            }
            catch
            {
                return Task.FromResult(false);
            }
        }

        public Task<PaymentWebhookResult> ProcessWebhookAsync(string payload)
        {
            try
            {
                using var jsonDocument = JsonDocument.Parse(payload);
                var root = jsonDocument.RootElement;
                
                var orderElement = root.TryGetProperty("order", out var ord) ? ord : root;
                
                var orderId = orderElement.TryGetProperty("orderId", out var oid) ? oid.GetString() : null;
                var externalOrderId = orderElement.TryGetProperty("merchantReferenceId", out var ext) ? ext.GetString() : null;
                var amount = orderElement.TryGetProperty("amount", out var am) ? am.GetDecimal() : 0m;
                var currency = orderElement.TryGetProperty("currency", out var curr) ? curr.GetString() : "EGP";
                var status = orderElement.TryGetProperty("status", out var st) ? st.GetString() : null;
                var detailedStatus = orderElement.TryGetProperty("detailedStatus", out var dst) ? dst.GetString() : null;
                var signature = root.TryGetProperty("signature", out var sig) ? sig.GetString() : null;
                
                var timestamp = root.TryGetProperty("timeStamp", out var ts1) ? ts1.GetString() : (root.TryGetProperty("timestamp", out var ts2) ? ts2.GetString() : null);

                if (string.IsNullOrEmpty(status) || string.IsNullOrEmpty(externalOrderId))
                {
                     return Task.FromResult(new PaymentWebhookResult
                    {
                        IsSuccess = false,
                        ErrorMessage = "Missing critical fields in Geidea webhook."
                    });
                }

                bool isFailedState = status == "Failed" || status == "Cancelled" || detailedStatus == "Cancelled";

                if (!string.IsNullOrEmpty(signature) && !string.IsNullOrEmpty(timestamp))
                {
                    string amountStr = amount.ToString("0.00", CultureInfo.InvariantCulture);
                    string expectedSignature = GenerateWebhookSignature(_merchantPublicKey, amountStr, currency, orderId, status, externalOrderId, _apiPassword, timestamp);
                    string expectedSignature2 = GenerateWebhookSignature(_merchantPublicKey, amountStr, currency, orderId, detailedStatus, externalOrderId, _apiPassword, timestamp);
                    
                    if (signature != expectedSignature && signature != expectedSignature2 && !isFailedState)
                    {
                         return Task.FromResult(new PaymentWebhookResult
                        {
                            IsSuccess = false,
                            ErrorMessage = "Invalid signature in Geidea webhook."
                        });
                    }
                }

                var result = new PaymentWebhookResult
                {
                    IsSuccess = true,
                    ExternalOrderId = externalOrderId,
                    NewStatus = status?.Equals("Success", StringComparison.OrdinalIgnoreCase) == true ? PaymentStatus.Paid : PaymentStatus.Failed
                };

                return Task.FromResult(result);
            }
            catch (Exception ex)
            {
                return Task.FromResult(new PaymentWebhookResult
                {
                    IsSuccess = false,
                    ErrorMessage = "Failed to process Geidea webhook: " + ex.Message
                });
            }
        }
    }
}
