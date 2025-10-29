
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/login');
  return null; // A component must return something, even if it's null
}
