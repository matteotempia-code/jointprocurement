export function plural(n: number, singular: string, pluralForm: string) {
  return `${new Intl.NumberFormat("it-IT").format(n)} ${n === 1 ? singular : pluralForm}`;
}

export function daysBetween(from: Date, to = new Date()) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}
