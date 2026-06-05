export default function ErrorAlert({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-start gap-3">
      <span className="text-red-500 mt-0.5">⚠</span>
      <div className="flex-1">
        <p>{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 text-red-600 underline text-xs hover:no-underline">
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
