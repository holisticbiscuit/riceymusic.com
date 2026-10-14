// Soft scarf-blue light behind glass panels: pure radial gradients that fade to nothing, so
// there is no edge anywhere for the eye to catch. Sits inside a relative container.
export function Light({ height = 1100 }: { height?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-0 w-[160vw] -translate-x-1/2"
      style={{
        height,
        background:
          'radial-gradient(32% 28% at 32% 28%, rgba(47,79,168,0.38), transparent 70%), radial-gradient(30% 24% at 68% 52%, rgba(59,91,214,0.25), transparent 70%), radial-gradient(38% 26% at 44% 84%, rgba(20,41,106,0.42), transparent 72%)',
      }}
    />
  )
}
