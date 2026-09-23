// Every content MDX file exports its metadata; loaders validate the shape at build time.
declare module "*.mdx" {
  export const metadata: Record<string, unknown> | undefined;
}
