import { createSignal } from "solid-js";
import { customElement } from 'solid-element';


customElement("solid-counter", () => {
  const [count, setCount] = createSignal(0);
  const increment = () => setCount(count() + 1);

  return (
    <button type="button" onClick={increment}>
      {count()}
    </button>
  );
})