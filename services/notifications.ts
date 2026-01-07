
import { Transaction } from '../types';

const REMINDERS_KEY = 'finai_reminders_shown';

export const notificationService = {
  requestPermission: async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    
    const permission = await Notification.requestPermission();
    return permission === "granted";
  },

  scheduleReminder: (transaction: Transaction | any) => {
    if (!transaction.dataVencimento || Notification.permission !== "granted") return;

    const dueDate = new Date(transaction.dataVencimento + 'T12:00:00'); // Meio dia para evitar bugs de fuso
    const reminderDate = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
    const now = new Date();

    const delay = reminderDate.getTime() - now.getTime();

    // Se o lembrete for para o futuro, agendamos um timeout para a sessão atual
    if (delay > 0) {
      setTimeout(() => {
        notificationService.show(
          "Lembrete de Vencimento",
          `Sua conta "${transaction.descricao}" vence amanhã!`
        );
      }, delay);
    }
  },

  checkDueReminders: async (transactions: Transaction[]) => {
    if (Notification.permission !== "granted") return;

    const shownReminders = JSON.parse(localStorage.getItem(REMINDERS_KEY) || '[]');
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const dueSoon = transactions.filter(t => 
      t.dataVencimento === tomorrowStr && 
      !shownReminders.includes(t.id)
    );

    if (dueSoon.length > 0) {
      dueSoon.forEach(t => {
        notificationService.show(
          "Conta Vencendo Amanhã",
          `A conta "${t.descricao}" no valor de R$ ${t.valor.toFixed(2)} vence amanhã.`
        );
        shownReminders.push(t.id);
      });
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(shownReminders));
    }
  },

  show: (title: string, body: string) => {
    new Notification(title, {
      body,
      icon: 'https://cdn-icons-png.flaticon.com/512/552/552791.png', // Ícone financeiro genérico
    });
  }
};
