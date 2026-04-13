import { APP_NAME } from '../../utils/constants';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date().getFullYear()} {APP_NAME}. Built for the Malaysian CardFightVanguard! community. Made by Aslam.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Cardfight!! Vanguard is a trademark of Bushiroad Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
