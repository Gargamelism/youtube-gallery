import { AuthView } from "./types";

interface AuthButtonsProps {
  onOpenAuthModal: (view: AuthView) => void;
}

export default function AuthButtons({ onOpenAuthModal }: AuthButtonsProps) {
  return (
    <>
      <div className="Navigation__auth-buttons hidden md:flex items-center space-x-4">
        <button
          onClick={() => onOpenAuthModal("login")}
          className="Navigation__signin-button text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
        >
          Sign in
        </button>
        <button
          onClick={() => onOpenAuthModal("register")}
          className="Navigation__signup-button bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Sign up
        </button>
      </div>
    </>
  );
}
