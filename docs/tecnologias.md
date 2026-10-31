# Tecnologias propostas

O HTML do briefing usa JavaScript e CSS nativos. A stack abaixo descreve o produto a desenvolver.

### React + TypeScript + Vite

Uma interface com contratos tipados e componentes reaproveitáveis.

- **Onde entra:** Aplicativo web responsivo; UI com CSS próprio e primitivas Radix.
- **Contrato:** Estados de carregamento, vazio, falha e foco visível em todas as rotas.
- [Documentação](https://react.dev/)

### Python + FastAPI + Pydantic

Validar entradas e publicar contratos REST/OpenAPI.

- **Onde entra:** Servidor da aplicação; processamento pesado fora da requisição.
- **Contrato:** IDs obtidos da sessão; validação, paginação e erros legíveis.
- [Documentação](https://fastapi.tiangolo.com/)

### PostgreSQL + SQLAlchemy + Alembic

Relacionar registros, versões, permissões e auditoria.

- **Onde entra:** Banco transacional; migrações versionadas.
- **Contrato:** Chaves únicas, transações, backup e restauração testada.
- [Documentação](https://www.postgresql.org/docs/)

### Keycloak + OIDC + sessão no servidor

Reutilizar identidade, verificação de e-mail, recuperação e MFA da equipe.

- **Onde entra:** BFF Python com Authlib; JWT verificado na API.
- **Contrato:** Cookie HttpOnly/Secure/SameSite; CSRF; papéis e propriedade conferidos no servidor.
- [Documentação](https://www.keycloak.org/securing-apps/oidc-layers)

### S3 compatível + checksums

Guardar originais e derivados sem transformar o banco em repositório de mídia.

- **Onde entra:** Armazenamento privado por projeto e URLs temporárias.
- **Contrato:** Chaves e permissões geradas no servidor; tamanho, MIME e integridade validados.
- [Documentação](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)

### Redis + Celery

Executar importações e análises demoradas sem bloquear a tela.

- **Onde entra:** Workers separados da API com fila e status persistido.
- **Contrato:** Tarefa identificada por arquivo/versão; repetição idempotente e cancelamento cooperativo.
- [Documentação](https://docs.celeryq.dev/)

### Linux + Docker Compose + Caddy

Reproduzir o piloto e servir a interface por HTTPS.

- **Onde entra:** Ambientes de desenvolvimento, homologação e piloto separados.
- **Contrato:** Segredos fora do repositório, volumes persistentes e recuperação documentada.
- [Documentação](https://docs.docker.com/compose/)

### Git + CI + pytest + Vitest + Playwright

Verificar cálculo, contrato e percurso completo antes da entrega.

- **Onde entra:** Testes de API Python, componentes e navegador.
- **Contrato:** Versões fixadas no lockfile; testes de falha, autorização e retomada.
- [Documentação](https://playwright.dev/docs/intro)

### OpenTelemetry + Prometheus + Grafana

Observar recepção, latência, falhas e consumo.

- **Onde entra:** Instrumentação no servidor, métricas dos workers e logs estruturados.
- **Contrato:** Sem credenciais nos logs; alertas acionáveis e registro das interrupções.
- [Documentação](https://opentelemetry.io/docs/languages/python/)

### ESP32 + ESP-IDF / C++ + FreeRTOS

Controlador proposto para o protótipo educacional.

- **Onde entra:** Firmware de leitura, estado e telemetria em tarefas separadas.
- **Contrato:** Taxa, pinos e sensores definidos com Eletrônica; medir perdas e consumo.
- [Documentação](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/)

### USB serial + pySerial + NDJSON

Estabelecer primeiro um caminho de dados fácil de inspecionar.

- **Onde entra:** ESP32 → USB → serviço Python local → API/WebSocket.
- **Contrato:** Um objeto por linha; schema_version, seq, device_id e unidade; linhas inválidas ficam em quarentena.
- [Documentação](https://pyserial.readthedocs.io/)

### WebSocket + Plotly.js

Exibir telemetria recente sem confundi-la com o histórico.

- **Onde entra:** Gateway envia eventos; consultas REST recuperam sessões.
- **Contrato:** Estado stale, lacunas e desconexão explícitos; sem interpolação disfarçada de medição.
- [Documentação](https://plotly.com/javascript/)

### FreeCAD + STEP + STL + glTF

Separar arquivo de engenharia, impressão e visualização.

- **Onde entra:** STEP para reconstrução; STL para impressão; glTF otimizado no site.
- **Contrato:** Dimensões, unidades, tolerâncias e montagem verificados; preview não substitui desenho técnico.
- [Documentação](https://www.freecad.org/)

### Three.js + OrbitControls + GLTFLoader

Inspecionar sete subsistemas em 360°.

- **Onde entra:** Viewer com rotação, zoom, seleção, frente/topo e explosão.
- **Contrato:** Modelo com IDs de peças; modo sem WebGL mostra diagrama e lista textual.
- [Documentação](https://threejs.org/docs/)

### Esquema elétrico + KiCad + ensaios de bancada

Documentar alimentação, interfaces e proteção da montagem.

- **Onde entra:** EPS didático, OBC, payload e comunicação definidos por versão.
- **Contrato:** BOM, níveis lógicos, conexão e ensaios assinados; ADCS pode ser apenas demonstrativo.
- [Documentação](https://docs.kicad.org/)

### Modelo de custos + CSV / JSON

Transformar material e esforço numa oferta rastreável.

- **Onde entra:** Calculadora de margem, proposta comercial e histórico das premissas.
- **Contrato:** Preço = custo/(1−margem); tributos e demanda exigem levantamento próprio.
- [Documentação](https://docs.python.org/3/library/csv.html)
