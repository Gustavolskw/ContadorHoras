# Contador de Horas

Controle de horas de trabalho para micro empresa: calendário mensal com horas **trabalhadas** (chamados),
**pretendidas** (planejamento) e de **reunião/treinamento**, valor em R$ por semana e mês, e saldo acumulado
de horas para lançar no sistema de chamados.

**Stack:** Java 21 + Spring Boot 3 (API) · Angular 19 (web) · MongoDB 7 · Docker Compose.

## Funcionalidades

- **Calendário mensal** (segunda a domingo). Duplo clique (ou Enter) em um dia abre o modal de edição; no
  celular, toque e segure o dia.
- **Modal do dia:** horas trabalhadas, horas de reunião/treinamento, horas pretendidas, lista de
  **chamados** (número, nome, horas — botão "+" para adicionar) e observação.
- **Contador de hoje** com botões − / + (ou digitando o valor), horas pretendidas e faltantes.
- **Planejar mês:** preenche as horas pretendidas com o planejamento padrão por dia da semana.
- **Horas avulsas do mês** (seção abaixo do calendário): lançamentos com descrição e horas, sem dia
  específico, opcionalmente **rateados** — mês inteiro ou uma semana, em partes iguais nos dias úteis
  (seg–sex) ou proporcional ao planejamento padrão. O rateio é calculado ao salvar e aparece nos dias e na
  coluna Semana.
- **Resumo do mês e por semana** com valores em R$ (ocultáveis pelo ícone de olho).
- **Saldo de horas acumulado** de todos os meses (o sistema de chamados não filtra por mês).
- **Configurações pessoais:** valor da hora, visualização semanal/mensal, saldo inicial, incremento do
  contador, planejamento padrão, troca de senha e de perguntas de segurança.

## Regras de cálculo

| Item | Chamados (trabalhadas) | Reunião / treinamento | Horas avulsas |
|---|---|---|---|
| Feitas no mês | entra | — | entra |
| Pretendidas do mês | — | — | **entra** (mesmo valor: não cria diferença) |
| Valor em R$ (Saldo da semana, Resultado mês) | entra | entra | entra |
| Saldo de horas (Total horas, Saldo atual) | entra | **não entra** | entra |
| Faltantes contra as horas pretendidas | entra | entra | neutro (soma nos dois lados) |
| Semanas / dias do calendário | entra | entra | só a parte rateada |

- **Valor** = horas × valor da hora configurado pelo usuário.
- **Saldo atual** = saldo inicial + horas de chamados de todos os meses até o mês exibido.
- Semanas que cruzam a virada do mês contam **apenas os dias do mês** (nada é contado duas vezes).
- As horas de cada chamado somam nas horas trabalhadas do dia.
- As horas pretendidas do dia acompanham as feitas: se trabalhadas + reunião passarem do pretendido, o
  pretendido sobe junto (no contador, no modal, nos chamados e ao planejar o mês). Diminuir as feitas não
  reduz o pretendido.

Equivalência com a planilha original:

| Planilha | Sistema |
|---|---|
| Linhas Segunda → Domingo | Calendário mensal |
| Totais / Saldo (por semana) | Coluna "Semana" (modo de cálculo *por semana*) |
| Resultado Mês / Mes | Card "Mês" |
| Dia / Pret Dia / faltantes | Card "Hoje" |
| Total Horas + Feitas no mês = Saldo Atual | Card "Saldo de horas" |

## Arquitetura

```
                 ┌──────────────── rede Docker interna ────────────────┐
 Internet ──▶ nginx (gateway) ──/api──▶ backend ×N (Spring Boot) ──▶ mongo
 [Traefik]        │  80/443                       (balanceado)
                  └──── / ────▶ frontend (Angular estático)
```

- **nginx (gateway)** em `docker/nginx/` é a única entrada externa: TLS (certificado autoassinado gerado no
  primeiro start, ou o seu), cabeçalhos de segurança, gzip, limite de taxa em `/api/auth/` (10/min por IP,
  com rajada de 10) e **balanceamento** `least_conn` entre as réplicas do backend, com failover.
- Backend, frontend e MongoDB não publicam portas no host.
- Mais réplicas do backend: `BACKEND_REPLICAS=3` no `.env` e `./contador.sh start`.

## Rodando em um servidor Linux

Requisitos: **Docker Engine** com o plugin **Docker Compose** (`docker compose version`), `git` e `curl`.
O build do Java e do Angular acontece dentro dos containers — não é preciso instalar JDK nem Node no servidor.

```bash
git clone https://github.com/Gustavolskw/ContadorHoras.git
cd ContadorHoras
chmod +x contador.sh
./contador.sh start
```

No primeiro `start` o script cria o `.env` com senha do MongoDB e segredo JWT aleatórios. **Guarde esse
arquivo** (e faça backups): sem ele não é possível acessar o banco já existente.

Acesse `http://<ip-do-servidor>` (portas em `HTTP_PORT`/`HTTPS_PORT` no `.env`; padrão 80 e 443).

### Comandos

| Comando | O que faz |
|---|---|
| `./contador.sh start` | Cria o `.env` (se não existir), constrói e sobe tudo, e espera a API responder |
| `./contador.sh stop` | Para os serviços (os dados continuam no volume `mongo-data`) |
| `./contador.sh restart` | Para e sobe novamente |
| `./contador.sh status` | Estado dos containers |
| `./contador.sh logs [nginx\|backend\|frontend\|mongo]` | Acompanha os logs |
| `./contador.sh update` | `git pull` + reconstrói e sobe a nova versão |
| `./contador.sh backup` | Salva o banco em `backups/contadorhoras-AAAAMMDD-HHMMSS.archive.gz` |
| `./contador.sh restore <arquivo>` | Restaura um backup (pede confirmação; substitui os dados atuais) |

Os containers usam `restart: unless-stopped`, então voltam sozinhos após reiniciar o servidor (desde que o
serviço do Docker inicie com o sistema: `sudo systemctl enable docker`).

Backup diário automático (crontab do usuário que roda o Docker):

```cron
0 3 * * * cd /caminho/ContadorHoras && ./contador.sh backup >> backups/cron.log 2>&1
```

### Domínio com Traefik (ex.: VPS Hostinger)

Quando o servidor já tem um **Traefik** cuidando das portas 80/443 e do Let's Encrypt, o gateway não
publica portas: o Traefik encaminha o domínio para ele pela rede compartilhada, seguindo
[a documentação do Traefik](https://doc.traefik.io/traefik/expose/docker/basic/)
(`providers.docker.network=proxy`, `exposedbydefault=false`, entrypoints `web`/`websecure`).

1. No DNS, crie um registro **A** do domínio (ex.: `horas.seudominio.com`) para o IP da VPS.
2. Descubra a rede do Traefik: `docker network ls` (na doc ela se chama `proxy`), o nome do
   *certresolver* e dos entrypoints configurados no seu Traefik.
3. No `.env`:
   ```env
   TRAEFIK_ENABLED=true
   APP_DOMAIN=horas.seudominio.com
   TRAEFIK_NETWORK=proxy
   TRAEFIK_CERTRESOLVER=letsencrypt
   TRAEFIK_ENTRYPOINT_HTTPS=websecure
   TRAEFIK_ENTRYPOINT_HTTP=web
   ```
4. `./contador.sh start` — o script inclui `docker-compose.traefik.yml` automaticamente, confere se a rede
   existe e aguarda a API. HTTP é redirecionado para HTTPS pelo Traefik.

Sem Traefik (modo standalone), o gateway publica 80/443 com o certificado autoassinado. Para um certificado
real, coloque `server.crt` e `server.key` no volume `nginx-certs` (montado em `/etc/nginx/certs`) e use
`NGINX_FORCE_HTTPS=true` para redirecionar HTTP para HTTPS. O MongoDB nunca é exposto para fora do Docker.

## Segurança e dados

- Cada usuário só acessa os próprios dados: o id do usuário vem sempre do token JWT, nunca da requisição.
  Não existe usuário administrador.
- Senhas e respostas das perguntas de segurança são guardadas com hash BCrypt.
- Política de senha (validada no backend em `PasswordPolicy.java` e espelhada no frontend em
  `core/password.ts`): 8 a 100 caracteres, maiúscula, minúscula, número, caractere especial, sem espaços
  e sem conter o nome de usuário. Vale para cadastro, troca e recuperação de senha.
- Recuperação de senha por 3 perguntas de segurança (respostas sem diferenciar maiúsculas/acentos).
- 5 tentativas erradas de login ou de recuperação bloqueiam a conta por 15 minutos.

## Estrutura

```
backend/            API Spring Boot (auth, settings, entry = lançamentos e resumos)
frontend/           Angular (pages/calendar, pages/settings, telas de login/cadastro/recuperação)
docker/nginx/       Gateway nginx (entrada, TLS, balanceamento, limite de taxa)
docker-compose.yml  mongo + backend + frontend + gateway nginx
docker-compose.traefik.yml  Override para publicar atrás de um Traefik (rede externa "proxy")
contador.sh         Script de operação para Linux
```

## Desenvolvimento local

```bash
docker compose up -d mongo                 # ou um MongoDB local na 27017
cd backend && mvn spring-boot:run          # defina MONGO_URI se o Mongo tiver senha
cd frontend && npm install && npm start    # http://localhost:4200, proxy /api -> 8080
```

## Créditos

Ícone/favicon: "calendar-clock" de [Lucide](https://lucide.dev) (licença ISC).
