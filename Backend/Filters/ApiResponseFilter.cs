using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Tabibi.DTOs;

namespace Tabibi.Filters
{
    public class ApiResponseFilter : IAsyncResultFilter
    {
        public async Task OnResultExecutionAsync(ResultExecutingContext context, ResultExecutionDelegate next)
        {
            // Do not intercept SignalR hubs
            var path = context.HttpContext.Request.Path.Value;
            if (path != null && path.StartsWith("/hubs"))
            {
                await next();
                return;
            }

            if (context.Result is ObjectResult objectResult)
            {
                var statusCode = objectResult.StatusCode ?? 200;
                var isSuccessStatusCode = statusCode >= 200 && statusCode < 300;

                // Handle ServiceResult and ServiceResult<T>
                if (objectResult.Value is ServiceResult serviceResult)
                {
                    if (serviceResult.IsSuccess)
                    {
                        var dataProp = serviceResult.GetType().GetProperty("Data");
                        var data = dataProp?.GetValue(serviceResult);

                        objectResult.Value = data;
                        objectResult.StatusCode = statusCode == 200 ? 200 : statusCode;
                    }
                    else
                    {
                        objectResult.Value = serviceResult.ErrorMessage;
                        if (statusCode == 200)
                        {
                            objectResult.StatusCode = 400;
                        }
                    }
                }
                else
                {
                    // If already formatted, avoid double formatting
                    var type = objectResult.Value?.GetType();
                    var hasSuccessProp = type?.GetProperty("success", System.Reflection.BindingFlags.IgnoreCase | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance) != null;

                    if (!hasSuccessProp)
                    {
                        if (!isSuccessStatusCode)
                        {
                            objectResult.Value = objectResult.Value;
                        }
                    }
                }
            }
            else if (context.Result is StatusCodeResult statusCodeResult)
            {
                var isSuccessStatusCode = statusCodeResult.StatusCode >= 200 && statusCodeResult.StatusCode < 300;

                if (isSuccessStatusCode)
                {
                    context.Result = new StatusCodeResult(statusCodeResult.StatusCode);
                }
                else
                {
                    context.Result = new ObjectResult("An error occurred.")
                    {
                        StatusCode = statusCodeResult.StatusCode
                    };
                }
            }

            await next();
        }
    }
}
