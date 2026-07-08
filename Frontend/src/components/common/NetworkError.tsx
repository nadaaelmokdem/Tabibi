import { MdWifiOff } from 'react-icons/md';

interface NetworkErrorProps {
  message?: string;
}

export default function NetworkError({ message = "Oops! Looks like you're offline. We're ready when you are." }: NetworkErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
      <div className="bg-red-50 p-4 rounded-full mb-4">
        <MdWifiOff className="text-red-400 text-4xl" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Connection Lost</h3>
      <p className="text-sm text-gray-500 max-w-xs">{message}</p>
    </div>
  );
}
