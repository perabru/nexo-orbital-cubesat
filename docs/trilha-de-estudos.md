# Trilha de estudos - NEXO ORBITAL

Do primeiro pacote ao painel de missão.

Fevereiro a julho de 2027. 82 horas estimadas de leitura e prática; não é a estimativa total do produto. O progresso fica no navegador e tem backup próprio na aba Trilha de estudos.

[Baixar kit de exercícios](../materiais/kit-estudos-cubesat.zip)

## E01 - Definir missão, versões e evidências

2027-02-01 a 2027-02-07 | 6 h | Base

Base recomendada: início da trilha.

**Aprender:** Missão de bancada; Requisitos verificáveis; Git; Diário de bordo.

**Prática:** Escrever o que o CubeSat demonstrará e criar uma versão do repositório com critérios de aceitação.

**Conferir:**
- [ ] Missão delimitada
- [ ] Três critérios mensuráveis
- [ ] Commit identificado

**Fontes:**
- [Pro Git em português](https://git-scm.com/book/pt-br/v2) - Git / autores do Pro Git | PT-BR | Leitura gratuita. Commits, branches, revisão e recuperação do trabalho.
- [Small Spacecraft Systems Virtual Institute](https://www.nasa.gov/smallsat-institute/) - NASA | EN | Leitura gratuita. Missão, subsistemas e engenharia de pequenos satélites. Referência para a bancada didática.

Entregas: P01, G01.

Arquivos: [diario_de_bordo.csv](../materiais/diario_de_bordo.csv), [protocolo_experimento.md](../materiais/protocolo_experimento.md).

## E02 - Ler circuitos e datasheets antes da montagem

2027-02-08 a 2027-02-21 | 10 h | Base

Base recomendada: E01.

**Aprender:** Tensão e corrente; GPIO e barramentos; Esquemático; BOM; Alimentação USB.

**Prática:** Montar o diagrama da bancada no KiCad e conferir as interfaces da placa escolhida.

**Conferir:**
- [ ] Tensões registradas
- [ ] Sensor identificado
- [ ] ERC revisado

**Fontes:**
- [KiCad: esquemático e placa](https://docs.kicad.org/) - KiCad | EN | Leitura gratuita. Esquemáticos, símbolos, conexões, ERC e documentação elétrica.
- [ESP-IDF: guia de programação](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/) - Espressif | EN | Leitura gratuita. Instalação, compilação, FreeRTOS, periféricos e exemplos oficiais.
- [BME280: datasheet do fabricante](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf) - Bosch Sensortec | EN | Leitura gratuita. Tensões, registradores, interfaces e limites do sensor.

Entregas: P02, P05.

Arquivos: [bom.csv](../materiais/bom.csv).

## E03 - Programar a aquisição no ESP32

2027-02-22 a 2027-03-07 | 12 h | Aplicação

Base recomendada: E02.

**Aprender:** C e C++; FreeRTOS; Amostragem; Fila; Timestamp e sequência.

**Prática:** Executar um exemplo oficial da placa e produzir pacotes com unidade, sequência e indicação da origem do dado.

**Conferir:**
- [ ] Pacotes numerados
- [ ] Unidades explícitas
- [ ] Reinício identificado

**Fontes:**
- [ESP-IDF: guia de programação](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/) - Espressif | EN | Leitura gratuita. Instalação, compilação, FreeRTOS, periféricos e exemplos oficiais.
- [BME280: datasheet do fabricante](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf) - Bosch Sensortec | EN | Leitura gratuita. Tensões, registradores, interfaces e limites do sensor.

Entregas: P06.

Arquivos: [telemetria_demo.ndjson](../materiais/telemetria_demo.ndjson), [validar_telemetria.py](../materiais/validar_telemetria.py).

## E04 - Levar pacotes ao Python sem perder a origem

2027-03-08 a 2027-03-28 | 12 h | Aplicação

Base recomendada: E03.

**Aprender:** Python; Serial; NDJSON; Validação; Checksum e sessão.

**Prática:** Validar o arquivo demonstrativo, introduzir uma linha defeituosa numa cópia e comprovar que ela é recusada.

**Conferir:**
- [ ] Arquivo válido aceito
- [ ] Linha inválida recusada
- [ ] Sessão preservada

**Fontes:**
- [Tutorial oficial de Python](https://docs.python.org/pt-br/3/tutorial/) - Python Software Foundation | PT-BR | Leitura gratuita. Funções, arquivos, exceções, módulos e ambientes. Para quem já conhece lógica.
- [pySerial: comunicação serial](https://pyserial.readthedocs.io/en/latest/) - pySerial | EN | Leitura gratuita. Porta serial, timeout, leitura de linhas e reconexão.
- [FastAPI: tutorial guiado](https://fastapi.tiangolo.com/tutorial/) - FastAPI | EN | Leitura gratuita. Rotas, validação, dependências e respostas de API.

Entregas: P04, P07, P08.

Arquivos: [telemetria_demo.ndjson](../materiais/telemetria_demo.ndjson), [validar_telemetria.py](../materiais/validar_telemetria.py).

## E05 - Modelar a estrutura e a visão 360°

2027-03-29 a 2027-04-18 | 10 h | Aplicação

Base recomendada: E04.

**Aprender:** Unidades em CAD; STEP e STL; Tolerância; glTF; Cena 3D.

**Prática:** Construir uma peça paramétrica no FreeCAD e importar uma exportação no visualizador de estudo.

**Conferir:**
- [ ] Escala documentada
- [ ] Encaixe conferido
- [ ] Peça e versão identificadas

**Fontes:**
- [Documentação do FreeCAD](https://github.com/FreeCAD/FreeCAD-documentation) - FreeCAD | EN | Leitura gratuita. Modelagem paramétrica, unidades, montagem e exportação.
- [Three.js: documentação](https://threejs.org/docs/) - Three.js | EN | Leitura gratuita. Cena, câmera, controles, materiais e carregamento de glTF.
- [Registro oficial glTF](https://registry.khronos.org/glTF/) - Khronos Group | EN | Leitura gratuita. Estrutura do asset, unidades, materiais e empacotamento GLB.

Entregas: P03, P10, P11.

Arquivos: [protocolo_experimento.md](../materiais/protocolo_experimento.md).

## E06 - Construir painel, banco e processamento

2027-04-19 a 2027-05-16 | 12 h | Aplicação

Base recomendada: E05.

**Aprender:** API; SQL; React; WebSocket; Jobs.

**Prática:** Desenhar o contrato da sessão, armazenar pacotes e mostrar série temporal com reconexão e indicação de falha.

**Conferir:**
- [ ] Pacote rastreável
- [ ] Histórico consultável
- [ ] Falha de comunicação visível

**Fontes:**
- [PostgreSQL: tutorial](https://www.postgresql.org/docs/current/tutorial.html) - PostgreSQL Global Development Group | EN | Leitura gratuita. Tabelas, chaves, joins, consultas e transações.
- [FastAPI: tutorial guiado](https://fastapi.tiangolo.com/tutorial/) - FastAPI | EN | Leitura gratuita. Rotas, validação, dependências e respostas de API.
- [React: primeiros componentes](https://react.dev/learn) - React | EN | Leitura gratuita. Estado, componentes, eventos e listas.
- [Celery: tarefas em segundo plano](https://docs.celeryq.dev/en/stable/) - Celery | EN | Leitura gratuita. Workers, filas, repetição e processamento desacoplado.

Entregas: P09, P10.

Arquivos: [telemetria_demo.ndjson](../materiais/telemetria_demo.ndjson).

## E07 - Ensaiar falhas, custo e operação

2027-05-17 a 2027-05-30 | 10 h | Validação

Base recomendada: E06.

**Aprender:** Teste integrado; Perdas e reinício; Reprodução; Custo; Manual.

**Prática:** Executar os casos do protocolo e atualizar a BOM com quantidade, preço cotado, origem e data da cotação.

**Conferir:**
- [ ] Ensaio repetido
- [ ] Falhas registradas
- [ ] Custo separado de estimativa

**Fontes:**
- [Playwright: primeiros testes](https://playwright.dev/docs/intro) - Playwright / Microsoft | EN | Leitura gratuita. Testes do percurso do usuário e evidências de falha.
- [Docker Compose: primeiro projeto](https://docs.docker.com/compose/gettingstarted/) - Docker | EN | Leitura gratuita. Serviços locais reproduzíveis, volumes e variáveis de ambiente.
- [Pro Git em português](https://git-scm.com/book/pt-br/v2) - Git / autores do Pro Git | PT-BR | Leitura gratuita. Commits, branches, revisão e recuperação do trabalho.

Entregas: P12, P13, P14, P15, P17.

Arquivos: [bom.csv](../materiais/bom.csv), [protocolo_experimento.md](../materiais/protocolo_experimento.md).

## E08 - Transformar evidências em monografia e artigo

2027-06-01 a 2027-07-16 | 10 h | Validação

Base recomendada: E07.

**Aprender:** Busca e fichamento; Método reproduzível; Figuras e tabelas; Citações e referências; Modelo INIC.

**Prática:** Preencher a matriz de referências, redigir um resultado sustentado pelos dados e fechar o primeiro texto integral do artigo em junho.

**Conferir:**
- [ ] Cada número tem origem
- [ ] Referências revisadas
- [ ] Modelo do evento conferido

**Fontes:**
- [Zotero: guia inicial](https://www.zotero.org/support/quick_start_guide) - Zotero | EN | Leitura gratuita. Coleções, metadados, citações e biblioteca compartilhada.
- [Normas e guias de normalização](https://biblioteca.ufes.br/normalizacao) - Sistema Integrado de Bibliotecas / UFES | PT-BR | Leitura gratuita. Conferir normas de apresentação, citações, referências e resumos.
- [INIC: modelo e submissão](https://www.univap.br/inic/submissao_trabalhos.php) - UNIVAP / INIC | PT-BR | Leitura gratuita. Consultar o modelo da edição de 2027 quando divulgado. A consulta atual identifica 2026.

Entregas: M08, M13, M15, A01, A05, A09.

Arquivos: [matriz_referencias.csv](../materiais/matriz_referencias.csv), [protocolo_experimento.md](../materiais/protocolo_experimento.md).

## Hardware e recursos de bancada

| Item | Quantidade | Uso | Etapa / observação |
| --- | --- | --- | --- |
| Computador com USB | 1 | Python, CAD, firmware e painel | Essencial. 8 GB de RAM são uma referência didática; medir o desempenho do conjunto escolhido. |
| Placa de desenvolvimento ESP32 | 1 | Controlador da bancada | Essencial. Conferir modelo e pinagem antes do esquema. Bancada didática, sem qualificação de voo. |
| Cabo USB de dados | 1 | Alimentação e comunicação serial | Essencial.  |
| Protoboard, jumpers e multímetro | 1 conjunto | Montagem e conferência elétrica | Essencial.  |
| Módulo BME280 compatível com 3,3 V | 1 | Exercício de leitura ambiental | Proposto. Confirmar a placa de breakout e suas tensões. |
| Base, fixadores e peças impressas | 1 conjunto | Estrutura e encaixes | Proposto. Impressora pode ser compartilhada pelo laboratório. |
| Fonte de bancada com limite de corrente | 1 | Ensaios de consumo | Laboratório. Usar sob o protocolo elétrico do laboratório. |

## Drive de Pobre: consulta registrada

[Drive de Pobre](https://drivedepobre.com/) | 31/10/2026 | Consulta bloqueada por verificação humana

O catálogo exigiu verificação humana nesta consulta. Nenhum curso ou arquivo do acervo foi validado ou redistribuído. Use os termos como roteiro de busca e confira autoria e permissão na origem. Os materiais desta trilha estão ligados diretamente às fontes e aos exercícios do projeto.

Termos de busca: eletrônica básica, ESP32, Python serial, FreeCAD.

## Uso dos arquivos

Os exercícios e dados do kit são autorais e sintéticos. Fontes externas permanecem no endereço do autor. Conferir versão, autoria e permissão antes de reutilizar material externo. A aplicação não depende do catálogo para abrir os recursos da trilha.
