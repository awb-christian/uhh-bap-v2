import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/logs');
  // This component will not render anything as it redirects immediately.
  // The content previously here has been removed.
  return null;
}
