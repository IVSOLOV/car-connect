import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  keywords?: string;
  noIndex?: boolean;
}

const SEO = ({
  title = "DiRent - Direct Owner Car Rentals | Zero Commission",
  description = "Rent cars directly from owners with zero commission fees. Skip the middleman and save on your next car rental. List your car for just $4.99/month.",
  canonicalUrl,
  ogImage = "/pwa-512x512.png",
  keywords = "car rental, rent car, car owner, direct rental, no commission, peer to peer car rental, list your car, rent my car",
  noIndex = false,
}: SEOProps) => {
  const siteUrl = window.location.origin;
  const fullCanonicalUrl = canonicalUrl ? `${siteUrl}${canonicalUrl}` : siteUrl;
  const siteName = "DiRent";

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={fullCanonicalUrl} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${siteUrl}${ogImage}`} />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteUrl}${ogImage}`} />
      <meta name="twitter:site" content="@DiRent" />
      
      {/* Additional SEO */}
      <meta name="author" content="DiRent" />
      <meta name="application-name" content={siteName} />
    </Helmet>
  );
};

export default SEO;
