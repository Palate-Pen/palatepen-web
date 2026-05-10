import type { Metadata } from 'next';
import ComingSoon from '@/components/ComingSoon';

export const metadata: Metadata = {
  title: 'Palate & Pen — Menu Design & Food Consultancy',
  description: 'We make your menu as good as your food. Menu design, culinary consulting, GP strategy and kitchen operations.',
};

export default function Home() {
  return <ComingSoon />;
}