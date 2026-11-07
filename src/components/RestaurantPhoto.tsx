import Image from 'next/image';
import { clsx } from 'clsx';
import { FoodIcon } from '@/components/icons/food/FoodIcon';
import type { Photo } from '@/lib/types';

/** Photo with fixed aspect ratio (no CLS). Falls back to a soft colour block + dish icon. */
export function RestaurantPhoto({
  photo,
  dish,
  sizes,
  priority = false,
  className,
  rounded = 'rounded-input',
}: {
  photo: Photo | null | undefined;
  dish: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  rounded?: string;
}) {
  return (
    <div className={clsx('relative overflow-hidden bg-thanhlong-soft', rounded, className)}>
      {photo ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" role="img" aria-label="Chưa có ảnh">
          <FoodIcon slug={dish} size={40} />
        </div>
      )}
    </div>
  );
}
