namespace Tabibi.Application.Common
{
    /// <summary>
    /// Represents the outcome of a use case without throwing exceptions for
    /// expected failure conditions (wrong password, duplicate email, etc).
    /// Exceptions are reserved for truly exceptional/unexpected failures.
    /// </summary>
    public class Result
    {
        public bool IsSuccess { get; protected init; }
        public string ErrorMessage { get; protected init; } = string.Empty;

        public static Result Success() => new() { IsSuccess = true };
        public static Result Failure(string error) => new() { IsSuccess = false, ErrorMessage = error };
    }

    public class Result<T> : Result
    {
        public T? Data { get; private init; }

        public static Result<T> Success(T data) => new() { IsSuccess = true, Data = data };
        public new static Result<T> Failure(string error) => new() { IsSuccess = false, ErrorMessage = error };
        public static Result<T> Failure(string error, T data) => new() { IsSuccess = false, ErrorMessage = error, Data = data };
    }
}
