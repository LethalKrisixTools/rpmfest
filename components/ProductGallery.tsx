'use client';

import Image from 'next/image';
import { useState } from 'react';

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(images[0] ?? '/assets/product-placeholder.svg');

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl bg-bg-mid">
        <Image
          src={active}
          alt={alt}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(src)}
              aria-label={`Ver imagen ${i + 1} de ${alt}`}
              className="relative h-14 w-14 overflow-hidden rounded-md border border-border-subtle"
            >
              <Image src={src} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
