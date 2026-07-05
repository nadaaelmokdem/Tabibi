namespace Tabibi.Application.Common
{
    public class TransactionAbortedException : Exception
    {
        public TransactionAbortedException(string reason) : base(reason) { }
    }
}
