export interface GarmentLike {
  photos?: string[];
  color: string;
  kind: string;
}

export function Garment({ product }: { product: GarmentLike }) {
  if (product.photos?.[0]) {
    return (
      <div className="product-thumb has-photo">
        <img src={product.photos[0]} alt="" />
      </div>
    );
  }
  return (
    <div className="product-thumb">
      <svg
        viewBox="0 0 48 48"
        width="38"
        height="38"
        fill={product.color}
        stroke="#ffffff25"
        strokeWidth=".8"
      >
        {product.kind === "pants" ? (
          <path d="M14 7h20l2 33H25l-1-22-2 22H12Z" />
        ) : product.kind === "coat" ? (
          <>
            <path d="m16 7-8 6-3 23 8 2 3-15-2 20h20l-2-20 3 15 8-2-3-23-8-6Z" />
            <path d="m18 7 6 9 6-9-4 15 4 21H19l5-27" fill="#00000020" />
          </>
        ) : (
          <>
            <path
              d={
                product.kind === "knit"
                  ? "m16 9-8 5-6 20 8 3 6-15v19h16V22l6 15 8-3-6-20-8-5-8 3Z"
                  : "m16 9-9 5-5 10 9 5 5-7v19h16V22l5 7 9-5-5-10-9-5c-2 5-14 5-16 0Z"
              }
            />
            <path d="M19 10q5 5 10 0M18 38h12" fill="none" stroke="#00000025" />
          </>
        )}
      </svg>
    </div>
  );
}

/* Логотип Wardrobe: отдельные варианты для тёмного и светлого режима */
