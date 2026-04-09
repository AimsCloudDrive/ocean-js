interface Plugin {
  name: string;
  order?: number;
  buildStart?: () => void | Promise<void>;
  buildEnd?: () => void | Promise<void>;
  resolveId?: (
    id: string,
    importer: string | undefined,
  ) => string | null | undefined | Promise<string | null | undefined>;
  load?: (
    id: string,
  ) => string | null | undefined | Promise<string | null | undefined>;
  transform?: (
    code: string,
    id: string,
  ) => string | null | undefined | Promise<string | null | undefined>;
}

export default Plugin;
