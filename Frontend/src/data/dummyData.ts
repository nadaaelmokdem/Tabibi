import type {
  ScheduleItem,
  ChatMessage,
} from "../types/DoctorDashboard";

const getTodayStr = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

export const initialSchedule: ScheduleItem[] = [
  {
    id: 1,
    time: "09:00 AM",
    duration: "30 min",
    name: "Ahmed Youssef",
    type: "Routine Checkup",
    badge: "Video",
    date: getTodayStr(),
    initials: "AY",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAo6PgLltl7iKdfOqrcrBHZsEoz0Wc1aOWY3vdlJ5Ekab1-acr5TKnlIiBwPN8SIM088R5g2Gv44eJILbr-QFfWqA9mYgUMSN1O_W9bHSi4BmzyuabVua2F5yKjedcmRxa6yt1yYU6R3Kpaw0jCfEliJq8lSTASrkXeUM_J3Ffe3c6drK6743JgKW1SaNq1NcMFeYRhFSmu-KmEaEy27PJZMkYh2a-Mbkx3L0sWmQa3H9VZYlNpiEWt4pqFlZtKvsR_l-7JccHpwQQ",
  },
  {
    id: 2,
    time: "10:30 AM",
    duration: "45 min",
    name: "Fatima Hassan",
    type: "ECG Review",
    badge: "Clinic",
    date: getTodayStr(),
    initials: "FH",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCFhOK8f87G6XKbE54p_69laa5aX_D36zFSspPOOOKvAVZhzUuuQs-5UWnK6NxopfKtStG3Fjrb4_XpIrSIBr3cccvFeQrcTf6fEqsh-zTs2WfnlGfFdtfDM-GHg0Cun7M7n0-qypVCN6pdi1qHp9JXF1vOgoiKAGB86j0JfAxkE5MYKq6iUwxo6YbbELtWpajiqmnVooTkkThNi-qZQL5BpipMiRJS8tMJ4tzRFty6AJT4toD2YJQO7ntllOHUgAMfq6eQ6x5Db1Y",
  },
  {
    id: 3,
    time: "01:00 PM",
    duration: "30 min",
    name: "Mahmoud Kamal",
    type: "Follow up",
    badge: "Video",
    date: getTodayStr(),
    initials: "MK",
  },
];

export const initialMessages: ChatMessage[] = [
  {
    id: 201,
    name: "Nadia Ali",
    text: "Thank you doctor, the medication is helping.",
    time: "10:42 AM",
    initials: "NA",
    isOnline: true,
  },
  {
    id: 202,
    name: "Karim Anwar",
    text: "Can we reschedule my appointment?",
    time: "Yesterday",
    initials: "KA",
    isOnline: false,
  },
];

export const initialStats = {
  earnings: "7,450 EGP",
  earningsTrend: "+12% this week",
  todaysAppointments: 5,
  nextSlot: "45m",
};
