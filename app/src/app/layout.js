import "./globals.css";

export const metadata = {
  title: "GenAI Inventory Optimization",
  description:
    "Feature extraction for Multi-Criteria Inventory ABC Classification using Generative AI and MongoDB Atlas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-US">
      <body>{children}</body>
    </html>
  );
}
