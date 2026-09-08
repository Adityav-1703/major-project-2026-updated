export function priceForHerbName(name: string) {
  let n = 0
  for (let i = 0; i < name.length; i += 1) n += name.charCodeAt(i)
  return 149 + (n % 8) * 50
}

export function formatInr(amount: number) {
  return `₹${amount}`
}
