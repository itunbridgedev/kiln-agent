import { rrulestr } from "rrule";

const recurrenceRule = "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA;COUNT=52";
const startDate = new Date(2026, 1, 1, 0, 0, 0, 0); // Feb 1, 2026

console.log("Testing RRULE:", recurrenceRule);
console.log("Start Date:", startDate);

const rule = rrulestr(recurrenceRule, { dtstart: startDate });
const dates = rule.all();

console.log("\nGenerated", dates.length, "dates");
console.log("\nFirst 10 dates:");
dates.slice(0, 10).forEach((d, i) => {
  console.log(`  ${i + 1}. ${d.toISOString().split('T')[0]} (${d.toLocaleDateString('en-US', { weekday: 'long' })})`);
});

if (dates.length > 10) {
  console.log(`\nLast 5 dates:`);
  dates.slice(-5).forEach((d, i) => {
    console.log(`  ${dates.length - 4 + i}. ${d.toISOString().split('T')[0]} (${d.toLocaleDateString('en-US', { weekday: 'long' })})`);
  });
}
