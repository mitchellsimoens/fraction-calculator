const formatRe = /^(\d*)(?:\s?(\d*)?\/?(\d*)?)?$/;

export const splitValue = (value: string): string[] => {
  const values = value.split(formatRe);

  if (values[1] == null) {
    values[1] = "";
  }
  if (values[2] == null) {
    values[2] = "";
  }
  if (values[3] == null) {
    values[3] = "";
  }

  return values;
};
