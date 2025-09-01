export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 via-black to-purple-900">
      <div className="w-full max-w-md rounded-2xl bg-black/40 p-8 shadow-xl backdrop-blur-md">
        <h1 className="text-center text-4xl font-extrabold text-white">DataDrip</h1>
        <p className="mt-2 text-center text-gray-400">Log in to your account</p>

        <form className="mt-8 space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-200">
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              className="mt-2 w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-200">
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              className="mt-2 w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
            />
            <a
              href="#"
              className="mt-2 inline-block text-sm text-center text-gray-400 hover:text-purple-400"
            >
              Forgot password?
            </a>
          </div>

          {/* Button */}
          <button
            type="submit"
            className="w-full rounded-lg bg-purple-700 px-4 py-2 font-medium text-white transition hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            Login
          </button>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-400">
            Don’t have an account yet?{" "}
            <a href="#" className="font-medium text-purple-400 hover:text-purple-300">
              Sign up.
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}