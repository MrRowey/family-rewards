export const DEFAULT_TASK_VAULT = [
  // Toddler Stage (Age 2 - 4)
  {
    title: "Put Toys in Bin",
    icon: "🧸",
    starValue: 1,
    minAge: 2,
    maxAge: 4,
    subSteps: ["Pick up 3 toys", "Put them in the toy bin"],
  },
  {
    title: "Put Shoes Away",
    icon: "👟",
    starValue: 1,
    minAge: 2,
    maxAge: 4,
    subSteps: ["Find your shoes", "Put by front door"],
  },

  // Early Primary (Age 5 - 8)
  {
    title: "Morning Routine",
    icon: "☀️",
    starValue: 3,
    minAge: 5,
    maxAge: 8,
    subSteps: [
      "Brush teeth for 2 minutes",
      "Wash face",
      "Get dressed",
      "Put shoes by door",
    ],
  },
  {
    title: "Clean Bedroom Floor",
    icon: "🧹",
    starValue: 2,
    minAge: 5,
    maxAge: 8,
    subSteps: ["Pick up dirty clothes", "Put books on shelf"],
  },
  {
    title: "Bedtime Routine",
    icon: "🌙",
    starValue: 3,
    minAge: 5,
    maxAge: 8,
    subSteps: [
      "Put on pajamas",
      "Brush teeth",
      "Pick out book",
      "In bed by bedtime",
    ],
  },

  // Upper Primary (Age 9 - 12)
  {
    title: "Unpack School Bag & Homework",
    icon: "📚",
    starValue: 4,
    minAge: 9,
    maxAge: 12,
    subSteps: [
      "Empty lunchbox into sink",
      "Complete 20 mins homework",
      "Pack bag for tomorrow",
    ],
  },
];