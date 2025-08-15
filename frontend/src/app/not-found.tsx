// frontend/src/app/not-found.tsx

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-yellow-200 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800">
      <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
      <p className="text-lg">Sorry, the page you are looking for does not exist.</p>
    </div>
  );
}
