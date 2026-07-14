namespace Tabibi.DTOs
{
    public class ServiceResult
    {
        public bool IsSuccess { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;

        public static ServiceResult Success() => new() { IsSuccess = true };
        public static ServiceResult Failure(string error) => new() { IsSuccess = false, ErrorMessage = error };
    }

    public class ServiceResult<T> : ServiceResult
    {
        public T? Data { get; set; }

        public static ServiceResult<T> Success(T data) => new() { IsSuccess = true, Data = data };
        public new static ServiceResult<T> Failure(string error) => new() { IsSuccess = false, ErrorMessage = error };
        public static ServiceResult<T> Failure(string error, T data) => new() { IsSuccess = false, ErrorMessage = error, Data = data };
    }
}
