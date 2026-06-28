// src/domain/Room.ts

export class Room {
  constructor(
    public readonly id: string,
    public name: string,
    public hostId: string,
    public inviteCode: string,
    public theme: string = 'default'
  ) {}

  // Lógica de negocio (pura, sin dependencias externas)
  changeTheme(newTheme: string) {
    // Aquí podríamos validar si el theme es válido
    this.theme = newTheme;
  }
}
