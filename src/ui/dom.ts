export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function img(src: string, className?: string): HTMLImageElement {
  const node = el('img', className);
  node.src = src;
  return node;
}

export function button(
  label: string,
  className: string,
  onClick: () => void,
  iconSrc?: string,
): HTMLButtonElement {
  const btn = el('button', className);
  if (iconSrc) btn.appendChild(img(iconSrc));
  btn.appendChild(el('span', undefined, label));
  btn.addEventListener('click', onClick);
  return btn;
}

export function show(node: HTMLElement, visible: boolean): void {
  node.classList.toggle('hidden', !visible);
}
