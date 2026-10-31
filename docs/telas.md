# Inventário de telas · NEXO ORBITAL

22 telas e seus critérios de aceite.

## N01 · Apresentação da missão

`/` · Público

Explicar a bancada e os quatro cursos.

- **Campos:** Oferta; Missões; Evidências.
- **Ações:** Explorar; Abrir viewer.
- **Estados:** Sem WebGL; Documento indisponível.
- **API:** `GET /v1/public/mission`
- **Aceite:** A apresentação identifica claramente o demonstrador em solo.

## N02 · Explorador 3D 360°

`/cubesat/3d` · Público

Inspecionar o modelo por qualquer ângulo.

- **Campos:** Modelo; Zoom; Frente; Topo; Explosão.
- **Ações:** Girar; Separar; Recentrar.
- **Estados:** Carregando; GPU indisponível; Modelo inválido.
- **API:** `GET /v1/cad/current`
- **Aceite:** Todas as peças selecionáveis possuem nome e alternativa textual.

## N03 · Subsistema e peças

`/cubesat/subsistemas/:id` · Público

Relacionar função, hardware e software.

- **Campos:** Payload; ADCS; OBC; Comm; EPS; Painéis; Antena.
- **Ações:** Selecionar; Ver conexões.
- **Estados:** Subsistema apenas conceitual; Versão antiga.
- **API:** `GET /v1/subsystems/:id`
- **Aceite:** A ficha diferencia item montado, referência e subsistema representado.

## N04 · CAD, impressão e montagem

`/cubesat/arquivos` · Público

Entregar arquivos compatíveis com a versão selecionada.

- **Campos:** STEP; STL; Unidades; BOM; Tolerâncias.
- **Ações:** Baixar; Ler montagem.
- **Estados:** Arquivo ausente; Revisão substituída.
- **API:** `GET /v1/cad/:version/files`
- **Aceite:** Download inclui versão e instruções; não anunciar peças sem arquivo verificado.

## N05 · Conectar a bancada

`/estacao/conectar` · Operação

Escolher dispositivo e iniciar recepção pelo gateway.

- **Campos:** Porta; Baud rate; Dispositivo; Protocolo.
- **Ações:** Conectar; Desconectar; Testar.
- **Estados:** Porta ocupada; Sem permissão; Gateway desligado.
- **API:** `POST /v1/connections`
- **Aceite:** Nenhuma porta é aberta silenciosamente; falha é apresentada ao operador.

## N06 · Telemetria atual

`/estacao/ao-vivo` · Operação

Mostrar última medição e estado de recepção.

- **Campos:** Valores; Unidades; Sequência; Idade do dado.
- **Ações:** Pausar vista; Marcar evento.
- **Estados:** Stale; Pacote inválido; Enlace perdido.
- **API:** `WS /v1/telemetry`
- **Aceite:** Valor antigo não permanece com rótulo de ao vivo.

## N07 · Configuração da missão

`/estacao/config` · Operação

Editar apenas parâmetros suportados pelo firmware.

- **Campos:** Canais; Taxa; Limites; Versão.
- **Ações:** Validar; Enviar; Confirmar leitura.
- **Estados:** Parâmetro não suportado; ACK ausente.
- **API:** `PUT /v1/devices/:id/config`
- **Aceite:** A tela confirma a configuração lida do dispositivo, não apenas a enviada.

## N08 · Sessões e histórico

`/sessoes` · Operação

Reabrir uma aquisição com contexto.

- **Campos:** Dispositivo; Período; Montagem; Firmware.
- **Ações:** Filtrar; Abrir; Comparar.
- **Estados:** Sem sessão; Dados parciais.
- **API:** `GET /v1/sessions`
- **Aceite:** A sessão conserva lacunas, unidades e origem do tempo.

## N09 · Eventos e falhas

`/sessoes/:id/eventos` · Operação

Examinar perda, reinício e ocorrências.

- **Campos:** Sequência; Flags; Erros; Anotações.
- **Ações:** Anotar; Localizar no gráfico.
- **Estados:** Evento incompleto; Sem conexão.
- **API:** `GET/POST /v1/sessions/:id/events`
- **Aceite:** Não editar dados brutos para remover uma falha.

## N10 · Exportar telemetria

`/sessoes/:id/exportar` · Operação

Reproduzir a sessão fora do painel.

- **Campos:** CSV; NDJSON; Manifesto; Checksum.
- **Ações:** Selecionar; Exportar.
- **Estados:** Arquivo grande; Exportação falhou.
- **API:** `POST /v1/exports`
- **Aceite:** Exportação inclui schema e unidade de todos os canais.

## N11 · Dispositivos e montagem

`/engenharia/dispositivos` · Engenharia

Vincular hardware a uma versão.

- **Campos:** MCU; Sensores; Pinos; BOM.
- **Ações:** Cadastrar; Versionar.
- **Estados:** ID duplicado; Componente pendente.
- **API:** `GET/POST /v1/devices`
- **Aceite:** A versão usada na sessão permanece recuperável.

## N12 · Ensaios e evidências

`/engenharia/testes` · Engenharia

Registrar o que foi realmente comprovado.

- **Campos:** Procedimento; Condição; Resultado; Anexos.
- **Ações:** Executar; Revisar; Reabrir.
- **Estados:** Falhou; Parcial; Pendente.
- **API:** `GET/POST /v1/test-runs`
- **Aceite:** Cada resultado aponta para montagem e firmware.

## N13 · Missões dos quatro cursos

`/equipes` · Gestão

Distribuir entregas e dependências.

- **Campos:** Responsável; Entrada; Entrega; Aceite.
- **Ações:** Atribuir; Revisar.
- **Estados:** Dependência bloqueada; Sem responsável.
- **API:** `GET /v1/deliverables`
- **Aceite:** Uma mudança de sensor sinaliza impacto no software, custo e comunicação.

## N14 · Materiais e fornecedores

`/empresa/materiais` · Gestão

Consolidar recursos com origem do valor.

- **Campos:** Item; Quantidade; Cotação; Disponibilidade.
- **Ações:** Importar; Atualizar; Comparar.
- **Estados:** Sem cotação; Item indisponível.
- **API:** `GET/POST /v1/cost-items`
- **Aceite:** Cotação tem data e não é confundida com custo realizado.

## N15 · Custos e preço

`/empresa/preco` · Gestão

Calcular cenários da oferta.

- **Campos:** Materiais; Horas; Rateio; Margem.
- **Ações:** Calcular; Salvar cenário.
- **Estados:** Margem inválida; Dados incompletos.
- **API:** `POST /v1/offers/calculate`
- **Aceite:** Margem deve estar abaixo de 100%; todos os valores têm premissas.

## N16 · Oferta e plano de empresa

`/empresa/oferta` · Gestão

Definir o que acompanha o Nexo Kit.

- **Campos:** Público; Kit; Manual; Suporte; Processo.
- **Ações:** Versionar; Exportar proposta.
- **Estados:** Escopo divergente; Custo pendente.
- **API:** `GET/PATCH /v1/offers/:id`
- **Aceite:** A oferta só anuncia capacidades demonstradas.

## N17 · Marca e campanha

`/marca` · Gestão

Construir comunicação baseada em evidências.

- **Campos:** Guia; Cartaz; Carrossel; Vídeo; CTA.
- **Ações:** Revisar peça; Relacionar prova.
- **Estados:** Afirmação sem evidência; Versão antiga.
- **API:** `GET/POST /v1/campaigns`
- **Aceite:** Página, vídeo e cartaz descrevem o mesmo escopo de bancada.

## N18 · Avaliação da demonstração

`/marca/avaliacao` · Gestão

Medir compreensão e interesse.

- **Campos:** Perguntas; Contexto; Respostas agregadas.
- **Ações:** Registrar; Comparar.
- **Estados:** Poucas respostas; Sem consentimento.
- **API:** `POST /v1/campaigns/:id/evaluations`
- **Aceite:** Resultados identificam período e amostra; não inventar conversão.

## N19 · Entrar e criar conta

`/conta/entrar` · Conta

Identificar a pessoa antes de abrir recursos privados.

- **Campos:** Nome público; E-mail; Retorno autorizado.
- **Ações:** Entrar via OIDC; Criar conta; Sair.
- **Estados:** E-mail não confirmado; Sessão expirada; Acesso recusado.
- **API:** `GET /auth/login · GET /auth/callback`
- **Aceite:** Nunca aceitar uma URL de retorno externa sem validação; nenhum token no armazenamento local.

## N20 · Verificação e recuperação de acesso

`/conta/recuperar` · Conta

Concluir verificação e redefinição pelo provedor de identidade.

- **Campos:** Solicitação; Expiração; Estado do link.
- **Ações:** Pedir novo link; Confirmar e-mail; Definir senha no provedor.
- **Estados:** Link expirado; Uso anterior; Limite de tentativas.
- **API:** `Fluxos de ação do Keycloak`
- **Aceite:** Respostas de recuperação não revelam se um endereço está cadastrado.

## N21 · Perfil e preferências

`/conta/perfil` · Conta

Editar os próprios dados e preferências de uso.

- **Campos:** Nome; Idioma; Preferências; Sessões.
- **Ações:** Salvar; Encerrar sessão; Solicitar exportação.
- **Estados:** Erro de validação; Sem conexão; Alteração pendente.
- **API:** `GET/PATCH /v1/me`
- **Aceite:** Uma conta nunca consulta o perfil privado de outra alterando um ID.

## N22 · Equipe, acessos e auditoria

`/gestao/equipe` · Gestão

Vincular pessoas ao escopo correto e registrar mudanças.

- **Campos:** Pessoa; Papel; Projeto; Convites; Histórico.
- **Ações:** Convidar; Revogar; Consultar alterações.
- **Estados:** Convite vencido; Sem permissão; Último responsável.
- **API:** `GET/POST /v1/members · GET /v1/audit`
- **Aceite:** Revogação vale no servidor; manter pelo menos um responsável e trilha de alteração.
