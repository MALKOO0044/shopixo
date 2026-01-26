export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Shopixo
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your global online shopping destination
          </p>
          <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Store Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">0</div>
                <div className="text-gray-600">Products</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">0</div>
                <div className="text-gray-600">Categories</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">0</div>
                <div className="text-gray-600">Orders</div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-gray-500">
                Installment 1: Core infrastructure deployed successfully
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Next: Product catalog foundation
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}