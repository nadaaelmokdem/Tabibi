using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Tabibi.Services
{
    public class S3FileService : IFileService
    {
        private readonly IConfiguration _configuration;

        public S3FileService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<string> UploadFileAsync(IFormFile file, string folderPrefix = "")
        {
            var serviceUrl = _configuration["S3Storage:ServiceUrl"];
            var accessKey = _configuration["S3Storage:AccessKey"];
            var secretKey = _configuration["S3Storage:SecretKey"];
            var bucketName = _configuration["S3Storage:BucketName"];

            var config = new AmazonS3Config { ServiceURL = serviceUrl, ForcePathStyle = true };
            var uniqueFileName = Guid.NewGuid().ToString() + "_" + Path.GetFileName(file.FileName);
            var objectKey = string.IsNullOrEmpty(folderPrefix) ? uniqueFileName : $"{folderPrefix}/{uniqueFileName}";

            using (var client = new AmazonS3Client(accessKey, secretKey, config))
            using (var stream = file.OpenReadStream())
            {
                var putRequest = new PutObjectRequest
                {
                    BucketName = bucketName,
                    Key = objectKey,
                    InputStream = stream,
                    ContentType = file.ContentType
                };
                await client.PutObjectAsync(putRequest);
            }
            return $"/api/files/{objectKey}";
        }

        public async Task DeleteFileAsync(string fileUrl)
        {
            if (string.IsNullOrEmpty(fileUrl) || !fileUrl.StartsWith("/api/files/")) return;

            var objectKey = fileUrl.Substring("/api/files/".Length);

            var serviceUrl = _configuration["S3Storage:ServiceUrl"];
            var accessKey = _configuration["S3Storage:AccessKey"];
            var secretKey = _configuration["S3Storage:SecretKey"];
            var bucketName = _configuration["S3Storage:BucketName"];

            var config = new AmazonS3Config { ServiceURL = serviceUrl, ForcePathStyle = true };

            using (var client = new AmazonS3Client(accessKey, secretKey, config))
            {
                var deleteRequest = new DeleteObjectRequest
                {
                    BucketName = bucketName,
                    Key = objectKey
                };
                await client.DeleteObjectAsync(deleteRequest);
            }
        }

        public async Task<byte[]> GetFileBytesAsync(string objectKey)
        {
            // Keeping for backwards compatibility if used elsewhere
            var stream = await GetFileStreamAsync(objectKey);
            using (var memoryStream = new MemoryStream())
            {
                await stream.CopyToAsync(memoryStream);
                return memoryStream.ToArray();
            }
        }

        public async Task<Stream> GetFileStreamAsync(string objectKey)
        {
            var serviceUrl = _configuration["S3Storage:ServiceUrl"];
            var accessKey = _configuration["S3Storage:AccessKey"];
            var secretKey = _configuration["S3Storage:SecretKey"];
            var bucketName = _configuration["S3Storage:BucketName"];

            var config = new AmazonS3Config { ServiceURL = serviceUrl, ForcePathStyle = true };
            var client = new AmazonS3Client(accessKey, secretKey, config);
            
            var getRequest = new GetObjectRequest { BucketName = bucketName, Key = objectKey };
            var response = await client.GetObjectAsync(getRequest);
            
            return response.ResponseStream;
        }

        public string GetPresignedUrl(string objectKey, TimeSpan expiration)
        {
            var serviceUrl = _configuration["S3Storage:ServiceUrl"];
            var accessKey = _configuration["S3Storage:AccessKey"];
            var secretKey = _configuration["S3Storage:SecretKey"];
            var bucketName = _configuration["S3Storage:BucketName"];

            var config = new AmazonS3Config { ServiceURL = serviceUrl, ForcePathStyle = true };
            using (var client = new AmazonS3Client(accessKey, secretKey, config))
            {
                var request = new GetPreSignedUrlRequest
                {
                    BucketName = bucketName,
                    Key = objectKey,
                    Expires = DateTime.UtcNow.Add(expiration)
                };
                return client.GetPreSignedURL(request);
            }
        }
    }
}
