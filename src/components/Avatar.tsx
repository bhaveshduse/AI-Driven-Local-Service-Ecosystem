import React, { useState } from 'react';
import clsx from 'clsx';

interface AvatarProps {
  src: string | undefined | null;
  name: string;
  className?: string;
}

const getInitials = (name: string) => {
  const nameParts = name.split(' ');
  if (nameParts.length > 1) {
    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const Avatar: React.FC<AvatarProps> = ({ src, name, className }) => {
  const [hasError, setHasError] = useState(false);

  const showFallback = !src || hasError;

  if (showFallback) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center rounded-full bg-blue-500 text-white font-bold',
          className
        )}
        title={name}
      >
        <span>{getInitials(name)}</span>
      </div>
    );
  }

  return (
    <img
      className={clsx('rounded-full object-cover', className)}
      src={src}
      alt={name}
      onError={() => setHasError(true)}
    />
  );
};

export default Avatar;