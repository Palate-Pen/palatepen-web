import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import MiseSection from '@/components/MiseSection';
import BlogPreview from '@/components/BlogPreview';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Services />
      <MiseSection />
      <BlogPreview />
      <Footer />
    </main>
  );
}