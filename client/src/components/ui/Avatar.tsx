export function Avatar({ photo, initial, size }: { photo: string; initial: string; size?: "small" }) {
  return (
    <span className={"avatar" + (size ? " " + size : "")}>
      {photo ? <img src={photo} alt="" /> : initial}
    </span>
  );
}
