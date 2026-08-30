type ProductImageProps = {
  name: string;
  categoryCode: string;
  className?: string;
};

function productVisual(name: string, categoryCode: string) {
  const value = `${name} ${categoryCode}`.toLowerCase();
  if (value.includes("guant")) return 0;
  if (value.includes("siring") || value.includes("ago ")) return 1;
  if (value.includes("acqua") || value.includes("bevanda")) return 2;
  if (value.includes("pasta") || value.includes("riso") || value.includes("aliment")) return 3;
  if (value.includes("deterg") || value.includes("ammorb") || value.includes("pulizia")) return 4;
  if (value.includes("pannolon") || value.includes("incontinen")) return 5;
  if (value.includes("carta") || value.includes("rotol") || value.includes("tissue")) return 6;
  if (value.includes("garz") || value.includes("cerott") || value.includes("monouso")) return 7;
  if (value.includes("cancell") || value.includes("penna") || value.includes("matita")) return 8;
  if (value.includes("manuten") || value.includes("vite") || value.includes("guarnizion")) return 9;
  if (value.includes("igiene") || value.includes("sapone") || value.includes("shampoo")) return 10;
  return 11;
}

const positions = [
  ["0%", "0%"], ["33.333%", "0%"], ["66.667%", "0%"], ["100%", "0%"],
  ["0%", "50%"], ["33.333%", "50%"], ["66.667%", "50%"], ["100%", "50%"],
  ["0%", "100%"], ["33.333%", "100%"], ["66.667%", "100%"], ["100%", "100%"],
];

export function ProductImage({ name, categoryCode, className = "" }: ProductImageProps) {
  const [x, y] = positions[productVisual(name, categoryCode)];
  return <div
    className={`product-packshot ${className}`}
    role="img"
    aria-label={`Immagine dimostrativa di ${name}`}
    style={{ backgroundImage: "url('/products/catalog-packshots-v2.png')", backgroundPosition: `${x} ${y}` }}
  />;
}
