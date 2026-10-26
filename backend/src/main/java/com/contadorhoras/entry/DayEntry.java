package com.contadorhoras.entry;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/** Um dia do calendário de um usuário: horas trabalhadas e horas pretendidas. */
@Document("day_entries")
@CompoundIndex(name = "user_date", def = "{'userId': 1, 'date': 1}", unique = true)
public class DayEntry {

    @Id
    private String id;

    private String userId;

    /** ISO yyyy-MM-dd: ordena lexicograficamente, o que permite consultas por intervalo. */
    private String date;

    private double workedHours;
    private double plannedHours;

    /** Reunião/treinamento: entra no valor (R$), mas não no saldo de horas de chamados. */
    private double meetingHours;
    private String note;

    /** Chamados trabalhados no dia (número + nome + horas). */
    private List<Ticket> tickets = new ArrayList<>();

    public record Ticket(String number, String name, double hours) {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public double getWorkedHours() { return workedHours; }
    public void setWorkedHours(double workedHours) { this.workedHours = workedHours; }
    public double getPlannedHours() { return plannedHours; }
    public void setPlannedHours(double plannedHours) { this.plannedHours = plannedHours; }
    public double getMeetingHours() { return meetingHours; }
    public void setMeetingHours(double meetingHours) { this.meetingHours = meetingHours; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public List<Ticket> getTickets() { return tickets == null ? List.of() : tickets; }
    public void setTickets(List<Ticket> tickets) { this.tickets = tickets; }
}
