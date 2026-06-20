const STORAGE_KEY = "ficha-cacador-a-revanche-5e-v2";
const LEGACY_KEY = "ficha-cacador-a-revanche-5e";
const ADMIN_EMAIL = "netojoseluizferreira@gmail.com";
const ADMIN_EMAILS_EXTRA = ["netojoseluizferrreira@gmail.com"];

const atributos = [
  {
    grupo: "Físicos",
    itens: [
      ["forca", "Força"],
      ["destreza", "Destreza"],
      ["vigor", "Vigor"]
    ]
  },
  {
    grupo: "Sociais",
    itens: [
      ["carisma", "Carisma"],
      ["manipulacao", "Manipulação"],
      ["autocontrole", "Autocontrole"]
    ]
  },
  {
    grupo: "Mentais",
    itens: [
      ["inteligencia", "Inteligência"],
      ["raciocinio", "Raciocínio"],
      ["determinacao", "Determinação"]
    ]
  }
];

const habilidades = [
  {
    grupo: "Físicas",
    itens: [
      ["armasBrancas", "Armas Brancas"],
      ["armasDeFogo", "Armas de Fogo"],
      ["atletismo", "Atletismo"],
      ["briga", "Briga"],
      ["conducao", "Condução"],
      ["furtividade", "Furtividade"],
      ["ladroagem", "Ladroagem"],
      ["oficios", "Ofícios"],
      ["sobrevivencia", "Sobrevivência"]
    ]
  },
  {
    grupo: "Sociais",
    itens: [
      ["empatiaAnimais", "Empatia com Animais"],
      ["etiqueta", "Etiqueta"],
      ["intimidacao", "Intimidação"],
      ["labia", "Lábia"],
      ["lideranca", "Liderança"],
      ["manha", "Manha"],
      ["performance", "Performance"],
      ["persuasao", "Persuasão"],
      ["subterfugio", "Subterfúgio"]
    ]
  },
  {
    grupo: "Mentais",
    itens: [
      ["academicos", "Acadêmicos"],
      ["ciencia", "Ciência"],
      ["financas", "Finanças"],
      ["investigacao", "Investigação"],
      ["medicina", "Medicina"],
      ["ocultismo", "Ocultismo"],
      ["percepcao", "Percepção"],
      ["politica", "Política"],
      ["tecnologia", "Tecnologia"]
    ]
  }
];

const distribuicoesHabilidades = {
  pau: { 4: 0, 3: 1, 2: 8, 1: 10 },
  equilibrado: { 4: 0, 3: 3, 2: 5, 1: 7 },
  especialista: { 4: 1, 3: 3, 2: 3, 1: 3 }
};

let vantagensCatalogo = [];
let defeitosCatalogo = [];
let trunfosCatalogo = [];
let distincaoCatalogoPorTrunfo = {};

const state = {
  finalizada: false,
  vantagens: [],
  defeitos: [],
  trunfos: [],
  distincoes: [],
  xpTotal: 0,
  xpGasto: 0,
  xpLog: [],
  rolagens: [],
  dano: {
    vitalidade: [],
    vontade: []
  }
};

const etapasPorModo = {
  criacao: ["identidade", "atributos", "habilidades", "vantagens", "trunfos", "extras", "preview"],
  gerenciar: ["preview", "dano", "rolagem", "xp", "extras"],
  admin: ["admin"]
};

let modoTela = "menu";
let supabaseClient = null;
let authUser = null;
let fichaAtualId = null;
let salvandoOnline = false;
let adminEditandoFicha = false;
let mestreEstado = {
  ficha_ids: [],
  notas: "",
  iniciativa: [],
  turno: 0
};

const idsCamposTexto = [
  "nomePersonagem",
  "nomeJogador",
  "cronica",
  "narrador",
  "conceito",
  "celula",
  "ambicao",
  "desejo",
  "credo",
  "impeto",
  "descricaoImpeto",
  "pilar1",
  "pilar2",
  "pilar3",
  "distribuicaoHabilidades",
  "especializacaoLivre",
  "especializacaoCiencia",
  "especializacaoAcademicos",
  "especializacaoOficios",
  "especializacaoPerformance",
  "mapaRelacionamentos",
  "equipamentos",
  "armas",
  "presa",
  "localCacada",
  "pistas",
  "consequencias",
  "anotacoes"
];

const todosAtributos = atributos.flatMap((grupo) => grupo.itens);
const todasHabilidades = habilidades.flatMap((grupo) => grupo.itens);
const camposNumericos = [...todosAtributos, ...todasHabilidades].map(([id]) => id);

const $ = (id) => document.getElementById(id);

function configSupabase() {
  return window.CACADOR_SUPABASE || {};
}

function supabaseConfigurado() {
  const config = configSupabase();
  return Boolean(config.url && config.anonKey && window.supabase?.createClient);
}

function emailAdmin() {
  return (configSupabase().adminEmail || ADMIN_EMAIL).toLowerCase();
}

function usuarioEhAdmin() {
  if (!authUser?.email) {
    return false;
  }

  const email = authUser.email.toLowerCase();
  return email === emailAdmin() || ADMIN_EMAILS_EXTRA.includes(email);
}

function fichaMecanicaTravada() {
  return state.finalizada && !adminEditandoFicha;
}

function nomeFichaAtual(ficha = montarFicha()) {
  return ficha.identidade?.nome || ficha.identidade?.conceito || "Ficha sem nome";
}

function formatarDataCurta(data) {
  const dataObj = new Date(data);
  if (Number.isNaN(dataObj.getTime())) {
    return "sem data";
  }
  return dataObj.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

async function carregarCatalogo() {
  const resposta = await fetch("catalogo.json", { cache: "no-store" });

  if (!resposta.ok) {
    throw new Error(`catalogo.json retornou HTTP ${resposta.status}.`);
  }

  const catalogo = await resposta.json();
  validarCatalogo(catalogo);

  vantagensCatalogo = catalogo.vantagens.map(normalizarEntradaComCusto);
  defeitosCatalogo = catalogo.defeitos.map(normalizarEntradaComCusto);
  trunfosCatalogo = catalogo.trunfos.map(normalizarEntradaSimples);
  distincaoCatalogoPorTrunfo = normalizarDistincoes(catalogo.distincoesPorTrunfo);
}

function validarCatalogo(catalogo) {
  if (!catalogo || typeof catalogo !== "object") {
    throw new Error("catalogo.json precisa conter um objeto JSON.");
  }

  validarListaComCusto(catalogo.vantagens, "vantagens");
  validarListaComCusto(catalogo.defeitos, "defeitos");
  validarListaSimples(catalogo.trunfos, "trunfos");

  if (!catalogo.distincoesPorTrunfo || typeof catalogo.distincoesPorTrunfo !== "object") {
    throw new Error("catalogo.json precisa conter distincoesPorTrunfo.");
  }

  catalogo.trunfos.forEach((trunfo) => {
    const lista = catalogo.distincoesPorTrunfo[trunfo.nome];
    if (!Array.isArray(lista)) {
      throw new Error(`Faltam Distinções para o Trunfo "${trunfo.nome}".`);
    }
    validarListaSimples(lista, `distincoesPorTrunfo.${trunfo.nome}`, false);
  });
}

function validarListaComCusto(lista, nomeLista) {
  validarListaSimples(lista, nomeLista);

  lista.forEach((item) => {
    if (!Number.isInteger(item.min) || !Number.isInteger(item.max) || item.min < 0 || item.max < item.min) {
      throw new Error(`${nomeLista}.${item.nome} precisa ter min/max inteiros válidos.`);
    }

    if (item.valores && (!Array.isArray(item.valores) || item.valores.some((valorItem) => !Number.isInteger(valorItem)))) {
      throw new Error(`${nomeLista}.${item.nome} tem valores inválidos.`);
    }
  });
}

function validarListaSimples(lista, nomeLista, exigeCategoria = true) {
  if (!Array.isArray(lista) || lista.length === 0) {
    throw new Error(`${nomeLista} precisa ser uma lista não vazia.`);
  }

  lista.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`${nomeLista}[${index}] precisa ser um objeto.`);
    }
    if (!item.nome || typeof item.nome !== "string") {
      throw new Error(`${nomeLista}[${index}] precisa ter nome.`);
    }
    if (exigeCategoria && (!item.categoria || typeof item.categoria !== "string")) {
      throw new Error(`${nomeLista}.${item.nome} precisa ter categoria.`);
    }
    if (!item.resumo || typeof item.resumo !== "string") {
      throw new Error(`${nomeLista}.${item.nome} precisa ter resumo.`);
    }
  });
}

function normalizarEntradaComCusto(item) {
  return {
    nome: item.nome,
    categoria: item.categoria,
    min: item.min,
    max: item.max,
    valores: item.valores ? [...item.valores] : undefined,
    resumo: item.resumo
  };
}

function normalizarEntradaSimples(item) {
  return {
    nome: item.nome,
    categoria: item.categoria,
    resumo: item.resumo
  };
}

function normalizarDistincoes(distincoesPorTrunfo) {
  return Object.entries(distincoesPorTrunfo).reduce((acc, [trunfo, distincoes]) => {
    acc[trunfo] = distincoes.map((distincao) => [distincao.nome, distincao.resumo]);
    return acc;
  }, {});
}

function mostrarErroInicializacao(erro) {
  console.error(erro);
  $("menuTela").hidden = false;
  $("appTela").hidden = true;
  $("topoAcoes").hidden = true;
  $("criarFichaMenu").disabled = true;
  $("importarFichaMenu").disabled = true;

  const aviso = document.createElement("p");
  aviso.className = "catalogo-descricao erro";
  aviso.textContent = `Não foi possível carregar catalogo.json. Rode a página por um servidor local e confira se o JSON é válido. Detalhe: ${erro.message}`;
  document.querySelector(".menu-card").appendChild(aviso);
}

async function inicializarSupabase() {
  if (!supabaseConfigurado()) {
    atualizarAuthInterface();
    return;
  }

  const config = configSupabase();
  supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const { data, error } = await supabaseClient.auth.getSession();
  if (!error) {
    authUser = data.session?.user || null;
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    authUser = session?.user || null;
    if (!authUser) {
      fichaAtualId = null;
    }
    atualizarAuthInterface();
  });

  atualizarAuthInterface();
}

function exigirLogin() {
  if (!supabaseClient) {
    alert("Configure supabase-config.js com a URL e anon key do seu projeto Supabase.");
    return false;
  }

  if (!authUser) {
    alert("Entre com email antes de usar fichas online.");
    return false;
  }

  return true;
}

function credenciaisAuth() {
  const email = valor("authEmailInput");
  const password = valor("authSenhaInput");

  if (!email || !password) {
    alert("Digite email e senha.");
    return null;
  }

  if (password.length < 6) {
    alert("A senha precisa ter pelo menos 6 caracteres.");
    return null;
  }

  return { email, password };
}

async function loginEmail() {
  if (!supabaseClient) {
    alert("Supabase ainda nÃ£o estÃ¡ configurado. Preencha supabase-config.js.");
    return;
  }

  const credenciais = credenciaisAuth();
  if (!credenciais) {
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword(credenciais);

  if (error) {
    alert(`Erro ao entrar: ${error.message}`);
    return;
  }

  authUser = data.user;
  atualizarAuthInterface();
}

async function criarContaEmail() {
  if (!supabaseClient) {
    alert("Supabase ainda nÃ£o estÃ¡ configurado. Preencha supabase-config.js.");
    return;
  }

  const credenciais = credenciaisAuth();
  if (!credenciais) {
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp(credenciais);

  if (error) {
    if (error.message?.toLowerCase().includes("email rate limit")) {
      alert("O Supabase tentou enviar email de confirmacao e bateu no limite. No Supabase, va em Authentication > Providers > Email e desative Confirm email.");
      return;
    }
    alert(`Erro ao criar conta: ${error.message}`);
    return;
  }

  authUser = data.session?.user || data.user || null;
  atualizarAuthInterface();
  alert(authUser ? "Conta criada e login realizado." : "Conta criada. Se o Supabase pedir confirmacao, verifique seu email ou desative Confirm email.");
}

async function sairEmail() {
  if (!supabaseClient) {
    return;
  }

  await supabaseClient.auth.signOut();
  authUser = null;
  fichaAtualId = null;
  mostrarMenu();
  atualizarAuthInterface();
}

function atualizarAuthInterface() {
  const configurado = Boolean(supabaseClient);
  const online = Boolean(authUser);
  const admin = usuarioEhAdmin();
  const email = authUser?.email || "";

  $("authUsuario").textContent = online ? email : configurado ? "Desconectado" : "Supabase nao configurado";
  $("menuAuthStatus").textContent = online ? `Conectado: ${email}` : configurado ? "Pronto para login" : "Supabase nao configurado";
  $("menuAuthDetalhe").textContent = online
    ? "Suas fichas serao salvas no banco online."
    : "Digite email e senha. Para nao enviar emails, desative Confirm email no Supabase.";

  $("loginEmailMenu").hidden = online;
  $("criarContaEmail").hidden = online;
  $("loginEmailTopo").hidden = online;
  $("sairEmail").hidden = !online;
  $("authEmailInput").disabled = online;
  $("authSenhaInput").disabled = online;
  $("criarFichaMenu").disabled = !online;
  $("importarFichaMenu").disabled = !online;
  $("abrirAdminMenu").hidden = !admin;
  $("salvarFicha").disabled = !online || modoTela === "admin";
  $("abrirFichasOnline").disabled = !online || modoTela === "admin";
  $("abrirAdmin").hidden = !admin || modoTela === "admin";

  document.querySelectorAll('[data-step-target="admin"]').forEach((aba) => {
    aba.hidden = true;
  });
}

async function salvarFichaOnline() {
  if (!exigirLogin()) {
    return;
  }

  const ficha = montarFicha();
  const payloadUpdate = {
    nome: nomeFichaAtual(ficha),
    sistema: ficha.sistema,
    dados: ficha
  };
  const payloadInsert = {
    ...payloadUpdate,
    owner_email: authUser.email,
    user_id: authUser.id
  };

  salvandoOnline = true;
  const query = fichaAtualId
    ? supabaseClient.from("fichas").update(payloadUpdate).eq("id", fichaAtualId).select("id").single()
    : supabaseClient.from("fichas").insert(payloadInsert).select("id").single();

  const { data, error } = await query;
  salvandoOnline = false;

  if (error) {
    alert(`Erro ao salvar online: ${error.message}`);
    return;
  }

  fichaAtualId = data.id;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ficha));
  alert("Ficha salva online.");
}

async function buscarFichasOnline(todas = false) {
  if (!exigirLogin()) {
    return [];
  }

  let query = supabaseClient
    .from("fichas")
    .select("id,nome,owner_email,updated_at,created_at,dados")
    .order("updated_at", { ascending: false });

  if (!todas) {
    query = query.eq("user_id", authUser.id);
  }

  const { data, error } = await query;
  if (error) {
    alert(`Erro ao carregar fichas: ${error.message}`);
    return [];
  }

  return data || [];
}

function renderFichasOnline(lista, containerId, admin = false) {
  $(containerId).innerHTML = lista.length
    ? lista.map((ficha) => `
      <div class="ficha-online-item">
        <div>
          <strong>${escaparHtml(ficha.nome || "Ficha sem nome")}</strong>
          <span>${escaparHtml(ficha.owner_email || "")}</span>
          <span>Atualizada em ${escaparHtml(formatarDataCurta(ficha.updated_at))}</span>
        </div>
        <div class="ficha-online-acoes">
          <button type="button" data-carregar-online="${ficha.id}">Carregar</button>
          ${admin ? "" : `<button class="secundario" type="button" data-excluir-online="${ficha.id}">Excluir</button>`}
        </div>
      </div>
    `).join("")
    : "<div>Nenhuma ficha salva online ainda.</div>";

  document.querySelectorAll("[data-carregar-online]").forEach((botao) => {
    botao.addEventListener("click", () => carregarFichaOnline(botao.dataset.carregarOnline));
  });

  document.querySelectorAll("[data-excluir-online]").forEach((botao) => {
    botao.addEventListener("click", () => excluirFichaOnline(botao.dataset.excluirOnline));
  });
}

async function abrirFichasOnline() {
  const lista = await buscarFichasOnline(false);
  renderFichasOnline(lista, "fichasOnlineLista");
  $("fichasOnlineModal").hidden = false;
}

function fecharFichasOnline() {
  $("fichasOnlineModal").hidden = true;
}

async function carregarFichaOnline(id, opcoes = {}) {
  if (!exigirLogin()) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("fichas")
    .select("id,dados")
    .eq("id", id)
    .single();

  if (error) {
    alert(`Erro ao abrir ficha: ${error.message}`);
    return;
  }

  fichaAtualId = data.id;
  adminEditandoFicha = Boolean(opcoes.adminEdit && usuarioEhAdmin());
  carregarFicha(data.dados);
  state.finalizada = Boolean(data.dados?.estado?.finalizada);
  mostrarApp(state.finalizada ? "gerenciar" : "criacao", state.finalizada ? "preview" : "identidade");
  fecharFichasOnline();
  autoSalvar();
}

async function excluirFichaOnline(id) {
  if (!confirm("Excluir esta ficha do banco online?")) {
    return;
  }

  const { error } = await supabaseClient.from("fichas").delete().eq("id", id);
  if (error) {
    alert(`Erro ao excluir ficha: ${error.message}`);
    return;
  }

  if (fichaAtualId === id) {
    fichaAtualId = null;
  }
  await abrirFichasOnline();
}

async function abrirAdmin() {
  if (!usuarioEhAdmin()) {
    alert("Apenas a conta administradora pode acessar esta pagina.");
    return;
  }

  adminEditandoFicha = false;
  mostrarApp("admin", "admin");
  await atualizarAdmin();
}

async function atualizarAdmin() {
  if (!usuarioEhAdmin()) {
    $("adminFichasLista").innerHTML = "<div>Entre com a conta administradora para ver as fichas.</div>";
    return;
  }

  await carregarEscudoMestre();
  await atualizarRolagensPublicasCronica();
}

async function carregarEscudoMestre() {
  if (!usuarioEhAdmin()) {
    return;
  }

  await carregarEstadoMestre();
  const lista = await buscarFichasOnline(true);
  renderFichasEscudo(lista);
  renderIniciativa();
  preencher("mestreAnotacoes", mestreEstado.notas || "");
  await renderMestreRolagens();
}

async function carregarEstadoMestre() {
  const { data, error } = await supabaseClient
    .from("escudo_mestre")
    .select("ficha_ids,notas,iniciativa,turno")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    alert(`Erro ao carregar escudo: ${error.message}`);
    return;
  }

  if (!data) {
    const { data: criado, error: erroCriar } = await supabaseClient
      .from("escudo_mestre")
      .insert({ id: 1, mestre_email: emailAdmin() })
      .select("ficha_ids,notas,iniciativa,turno")
      .single();

    if (erroCriar) {
      alert(`Erro ao criar escudo: ${erroCriar.message}`);
      return;
    }

    mestreEstado = normalizarEstadoMestre(criado);
    return;
  }

  mestreEstado = normalizarEstadoMestre(data);
}

function normalizarEstadoMestre(data) {
  return {
    ficha_ids: Array.isArray(data?.ficha_ids) ? data.ficha_ids : [],
    notas: data?.notas || "",
    iniciativa: Array.isArray(data?.iniciativa) ? data.iniciativa : [],
    turno: Number(data?.turno || 0)
  };
}

async function salvarEstadoMestre() {
  if (!usuarioEhAdmin()) {
    alert("Apenas o mestre admin pode salvar o escudo.");
    return false;
  }

  const { error } = await supabaseClient
    .from("escudo_mestre")
    .upsert({
      id: 1,
      mestre_email: emailAdmin(),
      ficha_ids: mestreEstado.ficha_ids,
      notas: mestreEstado.notas || "",
      iniciativa: mestreEstado.iniciativa || [],
      turno: mestreEstado.turno || 0
    });

  if (error) {
    alert(`Erro ao salvar escudo: ${error.message}`);
    return false;
  }

  return true;
}

function renderFichasEscudo(lista) {
  $("adminFichasLista").innerHTML = lista.length
    ? lista.map((ficha) => {
      const marcado = mestreEstado.ficha_ids.includes(ficha.id) ? "checked" : "";
      return `
        <div class="ficha-online-item">
          <div>
            <strong>${escaparHtml(ficha.nome || "Ficha sem nome")}</strong>
            <span>${escaparHtml(ficha.owner_email || "")}</span>
            <span>Atualizada em ${escaparHtml(formatarDataCurta(ficha.updated_at))}</span>
          </div>
          <div class="ficha-online-acoes">
            <label class="ficha-cronica-toggle">
              <input type="checkbox" data-ficha-cronica="${ficha.id}" ${marcado} />
              Crônica
            </label>
            <button type="button" data-editar-admin-ficha="${ficha.id}">Editar ficha</button>
          </div>
        </div>
      `;
    }).join("")
    : "<div>Nenhuma ficha salva online ainda.</div>";

  document.querySelectorAll("[data-ficha-cronica]").forEach((input) => {
    input.addEventListener("change", () => alternarFichaCronica(input.dataset.fichaCronica, input.checked));
  });

  document.querySelectorAll("[data-editar-admin-ficha]").forEach((botao) => {
    botao.addEventListener("click", () => carregarFichaOnline(botao.dataset.editarAdminFicha, { adminEdit: true }));
  });
}

async function alternarFichaCronica(id, selecionada) {
  const ids = new Set(mestreEstado.ficha_ids);
  if (selecionada) {
    ids.add(id);
  } else {
    ids.delete(id);
  }
  mestreEstado.ficha_ids = [...ids];
  await salvarEstadoMestre();
}

function resultadoRolagem(dados) {
  const sucessosBase = dados.filter((dado) => dado >= 6).length;
  const dezenas = dados.filter((dado) => dado === 10).length;
  const paresDez = Math.floor(dezenas / 2);
  const sucessosExtras = paresDez * 2;
  return {
    dados,
    sucessosBase,
    dezenas,
    paresDez,
    sucessosExtras,
    sucessos: sucessosBase + sucessosExtras,
    critico: paresDez > 0
  };
}

async function mestreRolarDados() {
  if (!usuarioEhAdmin()) {
    alert("Apenas o mestre admin pode usar esta rolagem.");
    return;
  }

  const quantidade = Math.max(1, valor("mestreRolagemDados"));
  const bonus = valor("mestreRolagemBonus");
  const total = Math.max(1, quantidade + bonus);
  const dados = Array.from({ length: total }, () => Math.floor(Math.random() * 10) + 1);
  const resultado = {
    ...resultadoRolagem(dados),
    totalDados: total,
    bonus,
    data: new Date().toISOString()
  };
  const descricao = valor("mestreRolagemDescricao") || "Rolagem do mestre";
  const tabela = valor("mestreRolagemVisibilidade") === "privada" ? "rolagens_privadas" : "rolagens_publicas";
  const { error } = await supabaseClient
    .from(tabela)
    .insert({ mestre_email: emailAdmin(), descricao, resultado });

  if (error) {
    alert(`Erro ao salvar rolagem: ${error.message}`);
    return;
  }

  preencher("mestreRolagemDescricao", "");
  await renderMestreRolagens();
  await atualizarRolagensPublicasCronica();
}

function rolagemBancoHtml(item, privada = false) {
  const resultado = item.resultado || {};
  const dados = Array.isArray(resultado.dados) ? resultado.dados : [];
  const critico = resultado.critico ? "sim" : "nao";
  const etiqueta = privada ? "Privada" : "Pública";
  return `
    <div>
      <strong>${escaparHtml(etiqueta)} - ${escaparHtml(item.descricao || "Rolagem")}</strong>
      <span>${escaparHtml(formatarDataRolagem(item.created_at || resultado.data))}</span>
      <span>Dados: ${dados.map((dado) => `<b>${escaparHtml(dado)}</b>`).join(", ") || "nenhum"}</span>
      <span>Sucessos: <strong>${Number(resultado.sucessos || 0)}</strong> (${Number(resultado.sucessosBase || 0)} em 6+, +${Number(resultado.sucessosExtras || 0)} por pares de 10) - Critico: ${critico}</span>
    </div>
  `;
}

async function buscarRolagensTabela(tabela, limite = 20) {
  const { data, error } = await supabaseClient
    .from(tabela)
    .select("id,descricao,resultado,created_at")
    .order("created_at", { ascending: false })
    .limit(limite);

  if (error) {
    alert(`Erro ao carregar rolagens: ${error.message}`);
    return [];
  }

  return data || [];
}

async function renderMestreRolagens() {
  if (!usuarioEhAdmin()) {
    return;
  }

  const publicas = await buscarRolagensTabela("rolagens_publicas", 10);
  const privadas = await buscarRolagensTabela("rolagens_privadas", 10);
  const html = [
    ...privadas.map((item) => rolagemBancoHtml(item, true)),
    ...publicas.map((item) => rolagemBancoHtml(item, false))
  ].join("");
  $("mestreRolagensHistorico").innerHTML = html || "<div>Nenhuma rolagem do mestre ainda.</div>";
}

async function atualizarRolagensPublicasCronica() {
  if (!supabaseClient || !authUser) {
    $("rolagensPublicasCronica").innerHTML = "<div>Entre para ver as rolagens públicas da crônica.</div>";
    return;
  }

  const publicas = await buscarRolagensTabela("rolagens_publicas", 20);
  $("rolagensPublicasCronica").innerHTML = publicas.length
    ? publicas.map((item) => rolagemBancoHtml(item, false)).join("")
    : "<div>Nenhuma rolagem pública ainda.</div>";
}

async function salvarMestreAnotacoes() {
  mestreEstado.notas = valor("mestreAnotacoes");
  if (await salvarEstadoMestre()) {
    alert("Anotações salvas.");
  }
}

async function adicionarIniciativa() {
  const nome = valor("iniciativaNome");
  if (!nome) {
    alert("Informe o nome na iniciativa.");
    return;
  }

  mestreEstado.iniciativa.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    nome,
    valor: valor("iniciativaValor")
  });
  mestreEstado.iniciativa.sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0));
  preencher("iniciativaNome", "");
  preencher("iniciativaValor", 0);
  mestreEstado.turno = Math.min(mestreEstado.turno, Math.max(0, mestreEstado.iniciativa.length - 1));
  renderIniciativa();
  await salvarEstadoMestre();
}

async function removerIniciativa(id) {
  mestreEstado.iniciativa = mestreEstado.iniciativa.filter((item) => item.id !== id);
  if (mestreEstado.turno >= mestreEstado.iniciativa.length) {
    mestreEstado.turno = 0;
  }
  renderIniciativa();
  await salvarEstadoMestre();
}

async function proximoTurno() {
  if (!mestreEstado.iniciativa.length) {
    return;
  }
  mestreEstado.turno = (mestreEstado.turno + 1) % mestreEstado.iniciativa.length;
  renderIniciativa();
  await salvarEstadoMestre();
}

async function limparIniciativa() {
  if (!confirm("Limpar toda a iniciativa?")) {
    return;
  }
  mestreEstado.iniciativa = [];
  mestreEstado.turno = 0;
  renderIniciativa();
  await salvarEstadoMestre();
}

function renderIniciativa() {
  $("iniciativaLista").innerHTML = mestreEstado.iniciativa.length
    ? mestreEstado.iniciativa.map((item, index) => `
      <div class="iniciativa-item ${index === mestreEstado.turno ? "ativo" : ""}">
        <div>
          <strong>${index === mestreEstado.turno ? "Turno atual - " : ""}${escaparHtml(item.nome)}</strong>
          <span>Ordem: ${escaparHtml(item.valor)}</span>
        </div>
        <button class="secundario" type="button" data-remover-iniciativa="${item.id}">Remover</button>
      </div>
    `).join("")
    : "<div>Nenhuma iniciativa cadastrada.</div>";

  document.querySelectorAll("[data-remover-iniciativa]").forEach((botao) => {
    botao.addEventListener("click", () => removerIniciativa(botao.dataset.removerIniciativa));
  });
}

function criarGrupo(container, grupos, tipo) {
  container.innerHTML = "";

  grupos.forEach((grupo) => {
    const box = document.createElement("div");
    box.className = "grupo";

    const titulo = document.createElement("h3");
    titulo.textContent = grupo.grupo;
    box.appendChild(titulo);

    grupo.itens.forEach(([id, nome]) => {
      const label = document.createElement("label");
      label.textContent = nome;

      const input = document.createElement("input");
      input.type = "number";
      input.id = id;
      input.min = tipo === "atributo" ? "1" : "0";
      input.max = "5";
      input.value = tipo === "atributo" ? "1" : "0";
      input.dataset.field = "true";

      label.appendChild(input);
      box.appendChild(label);
    });

    container.appendChild(box);
  });
}

function popularSelectCatalogo(select, catalogo) {
  select.innerHTML = "";
  catalogo.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${item.nome} (${item.categoria})`;
    select.appendChild(option);
  });
}

function popularTrunfos() {
  const select = $("trunfoSelect");
  select.innerHTML = "";
  trunfosCatalogo.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${item.nome} (${item.categoria})`;
    select.appendChild(option);
  });
}

function trunfoBaseParaDistincao() {
  if (state.trunfos.length === 1) {
    return state.trunfos[0].nome;
  }

  const catalogo = trunfosCatalogo[Number($("trunfoSelect").value)];
  return catalogo?.nome || "";
}

function popularDistincoes() {
  const select = $("distincaoSelect");
  const trunfoNome = trunfoBaseParaDistincao();
  const opcoes = distincaoCatalogoPorTrunfo[trunfoNome] || [];
  const valorAtual = select.value;

  select.innerHTML = "";
  opcoes.forEach(([nome, resumo], index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = nome;
    option.dataset.resumo = resumo;
    select.appendChild(option);
  });

  if ([...select.options].some((option) => option.value === valorAtual)) {
    select.value = valorAtual;
  }

  atualizarDescricaoDistincao();
}

function custoTexto(item) {
  if (item.valores) {
    return item.valores.length === 1 ? `${item.valores[0]}` : item.valores.join(" ou ");
  }

  return item.min === item.max ? `${item.min}` : `${item.min}-${item.max}`;
}

function limitePontosPorTipo(tipo) {
  return tipo === "vantagem" ? 7 : 2;
}

function totalPontosPorTipo(tipo) {
  return tipo === "vantagem" ? totalPontos(state.vantagens) : totalPontos(state.defeitos);
}

function pontosCatalogoSemAlerta(catalogo, pontos) {
  if (!catalogo) {
    return 0;
  }

  if (catalogo.valores && !catalogo.valores.includes(pontos)) {
    return catalogo.valores[0] || catalogo.min;
  }

  return Math.max(catalogo.min, Math.min(catalogo.max, pontos));
}

function pontosSelecionadosPorTipo(tipo) {
  if (tipo === "vantagem") {
    const catalogo = vantagensCatalogo[Number($("vantagemSelect").value)];
    return pontosCatalogoSemAlerta(catalogo, valor("vantagemPontos"));
  }

  const catalogo = defeitosCatalogo[Number($("defeitoSelect").value)];
  return pontosCatalogoSemAlerta(catalogo, valor("defeitoPontos"));
}

function excedeLimiteCriacao(tipo, pontos) {
  return totalPontosPorTipo(tipo) + pontos > limitePontosPorTipo(tipo);
}

function atualizarDescricaoCatalogo(tipo) {
  const mapas = {
    vantagem: [vantagensCatalogo, "vantagemSelect", "vantagemDescricao"],
    defeito: [defeitosCatalogo, "defeitoSelect", "defeitoDescricao"],
    trunfo: [trunfosCatalogo, "trunfoSelect", "trunfoDescricao"]
  };
  const [catalogo, selectId, descricaoId] = mapas[tipo];
  const item = catalogo[Number($(selectId).value)];
  if (!item) {
    return;
  }

  const custo = tipo === "trunfo" ? "sem custo em pontos" : `${custoTexto(item)} ponto(s)`;
  $(descricaoId).innerHTML = `<strong>${item.nome}</strong> (${item.categoria}) - Custo: ${custo}. ${item.resumo}`;
}

function atualizarDescricaoDistincao() {
  const trunfoNome = trunfoBaseParaDistincao();
  const opcoes = distincaoCatalogoPorTrunfo[trunfoNome] || [];
  const item = opcoes[Number($("distincaoSelect").value)];

  if (!item) {
    $("distincaoDescricao").textContent = state.trunfos.length >= 2
      ? "Você escolheu dois Trunfos; Distinções ficam travadas neste caminho de criação."
      : "Escolha um Trunfo para ver suas Distinções.";
    return;
  }

  $("distincaoDescricao").innerHTML = `<strong>${item[0]}</strong> (${trunfoNome}) - ${item[1]}`;
}

function normalizarPontosCatalogo(catalogo, pontos) {
  if (catalogo.valores && !catalogo.valores.includes(pontos)) {
    alert(`${catalogo.nome} só aceita ${custoTexto(catalogo)} ponto(s).`);
    return null;
  }

  return Math.max(catalogo.min, Math.min(catalogo.max, pontos));
}

function valor(id) {
  const campo = $(id);
  if (!campo) {
    return "";
  }
  if (campo.type === "number") {
    return Number(campo.value || 0);
  }
  return campo.value.trim();
}

function preencher(id, novoValor) {
  const campo = $(id);
  if (!campo) {
    return;
  }
  campo.value = novoValor ?? "";
}

function xpDisponivel() {
  return state.xpTotal - state.xpGasto;
}

function totalCaixasVitalidade() {
  return valor("vigor") + 3;
}

function totalCaixasVontade() {
  return valor("autocontrole") + valor("determinacao");
}

function maiorRecuperacaoVontade() {
  return Math.max(valor("autocontrole"), valor("determinacao"));
}

function totalPontos(lista) {
  return lista.reduce((soma, item) => soma + Number(item.pontos || 0), 0);
}

function contarPorValor(ids) {
  return ids.reduce((contagem, id) => {
    const n = valor(id);
    contagem[n] = (contagem[n] || 0) + 1;
    return contagem;
  }, {});
}

function setEtapa(nomeEtapa) {
  const etapasPermitidas = etapasPorModo[modoTela] || [];
  const etapaSolicitada = nomeEtapa === "admin" && !usuarioEhAdmin() ? "preview" : nomeEtapa;
  const etapaFinal = etapasPermitidas.includes(etapaSolicitada) ? etapaSolicitada : etapasPermitidas[0];

  document.querySelectorAll(".aba").forEach((aba) => {
    aba.classList.toggle("ativa", aba.dataset.stepTarget === etapaFinal);
  });
  document.querySelectorAll(".etapa").forEach((etapa) => {
    etapa.classList.toggle("ativa", etapa.dataset.step === etapaFinal);
  });

  if (etapaFinal === "rolagem") {
    atualizarRolagensPublicasCronica();
  }
}

function atualizarModoInterface() {
  const noMenu = modoTela === "menu";
  const noAdmin = modoTela === "admin";
  const etapasPermitidas = etapasPorModo[modoTela] || [];
  const ordemGerenciar = { preview: 1, dano: 2, rolagem: 3, xp: 4, extras: 5 };

  $("menuTela").hidden = !noMenu;
  $("appTela").hidden = noMenu;
  $("topoAcoes").hidden = noMenu;
  document.querySelector(".painel-status").hidden = noMenu || noAdmin;
  document.querySelector(".abas").hidden = noMenu || noAdmin;

  document.querySelectorAll(".aba").forEach((aba) => {
    const adminBloqueado = aba.dataset.stepTarget === "admin" && !usuarioEhAdmin();
    const visivel = etapasPermitidas.includes(aba.dataset.stepTarget) && !adminBloqueado;
    aba.hidden = !visivel;
    aba.style.order = modoTela === "gerenciar" ? String(ordemGerenciar[aba.dataset.stepTarget] || 9) : "";
  });

  document.querySelectorAll(".etapa").forEach((etapa) => {
    const adminBloqueado = etapa.dataset.step === "admin" && !usuarioEhAdmin();
    etapa.hidden = !etapasPermitidas.includes(etapa.dataset.step) || adminBloqueado;
  });

  $("novaFicha").hidden = noAdmin;
  $("salvarFicha").hidden = noAdmin;
  $("finalizarFicha").hidden = modoTela !== "criacao";
  $("abrirFichasOnline").hidden = noAdmin;
  $("exportarTxt").hidden = noAdmin;
  $("voltarMenuTopo").hidden = noMenu;
  document.querySelector(".xp-status").hidden = modoTela !== "gerenciar";
  document.querySelector(".painel-status").classList.toggle("sem-xp", modoTela !== "gerenciar");
  atualizarAuthInterface();
}

function mostrarMenu() {
  modoTela = "menu";
  adminEditandoFicha = false;
  atualizarModoInterface();
}

function mostrarApp(modo, etapaInicial) {
  modoTela = modo;
  atualizarModoInterface();
  setEtapa(etapaInicial || etapasPorModo[modo][0]);
}

function resetarFicha() {
  state.finalizada = false;
  state.vantagens = [];
  state.defeitos = [];
  state.trunfos = [];
  state.distincoes = [];
  state.xpTotal = 0;
  state.xpGasto = 0;
  state.xpLog = [];
  state.rolagens = [];
  state.dano = { vitalidade: [], vontade: [] };

  idsCamposTexto.forEach((id) => preencher(id, ""));
  preencher("distribuicaoHabilidades", "pau");

  todosAtributos.forEach(([id]) => preencher(id, 1));
  todasHabilidades.forEach(([id]) => preencher(id, 0));

  [
    "vantagemDetalhe",
    "defeitoDetalhe",
    "trunfoDetalhe",
    "distincaoDetalhe",
    "xpGanhoObs",
    "xpGastoDetalhe",
    "rolagemBonus",
    "danoVitalidadeQuantidade",
    "danoVontadeQuantidade"
  ].forEach((id) => preencher(id, ""));

  preencher("xpGanhoQuantidade", 1);
  preencher("xpGastoPontos", 1);
  preencher("rolagemBonus", 0);
  preencher("danoVitalidadeQuantidade", 1);
  preencher("danoVontadeQuantidade", 1);
  preencher("danoVitalidadeTipo", "superficial");
  preencher("danoVontadeTipo", "superficial");
}

function iniciarCriacao() {
  if (!exigirLogin()) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_KEY);
  fichaAtualId = null;
  adminEditandoFicha = false;
  resetarFicha();
  mostrarApp("criacao", "identidade");
  atualizarTudo();
  autoSalvar();
}

function itemListaHtml(item, tipo, index) {
  const detalhe = item.detalhe ? ` - ${item.detalhe}` : "";
  const trunfo = item.trunfo ? ` - ${item.trunfo}` : "";
  const resumo = item.resumo ? `<small>${item.resumo}</small>` : "";
  return `
    <div>
      <strong>${item.nome} ${item.pontos ? `(${item.pontos})` : ""}</strong>
      <span>${item.categoria || ""}${trunfo}${detalhe}</span>
      ${resumo}
    </div>
    <button class="secundario" type="button" data-remove="${tipo}" data-index="${index}">Remover</button>
  `;
}

function renderListas() {
  $("listaVantagens").innerHTML = state.vantagens.map((item, index) => {
    return `<div class="item-selecionado">${itemListaHtml(item, "vantagem", index)}</div>`;
  }).join("") || "<p class=\"aviso\">Nenhuma vantagem selecionada.</p>";

  $("listaDefeitos").innerHTML = state.defeitos.map((item, index) => {
    return `<div class="item-selecionado">${itemListaHtml(item, "defeito", index)}</div>`;
  }).join("") || "<p class=\"aviso\">Nenhum defeito selecionado.</p>";

  $("listaTrunfos").innerHTML = state.trunfos.map((item, index) => {
    return `<div class="item-selecionado">${itemListaHtml(item, "trunfo", index)}</div>`;
  }).join("") || "<p class=\"aviso\">Nenhum trunfo selecionado.</p>";

  $("listaDistincoes").innerHTML = state.distincoes.map((item, index) => {
    return `<div class="item-selecionado">${itemListaHtml(item, "distincao", index)}</div>`;
  }).join("") || "<p class=\"aviso\">Nenhuma distinção selecionada.</p>";

  document.querySelectorAll("[data-remove]").forEach((botao) => {
    botao.addEventListener("click", () => removerItem(botao.dataset.remove, Number(botao.dataset.index)));
  });
}

function adicionarItem(tipo) {
  if (fichaMecanicaTravada() && tipo !== "xp") {
    alert("Ficha finalizada. Use o painel de XP para alterar a ficha.");
    return;
  }

  if (tipo === "vantagem") {
    const catalogo = vantagensCatalogo[Number($("vantagemSelect").value)];
    const pontos = normalizarPontosCatalogo(catalogo, valor("vantagemPontos"));
    if (pontos === null) {
      return;
    }
    if (!adminEditandoFicha && excedeLimiteCriacao("vantagem", pontos)) {
      alert(`Vantagens nÃ£o podem passar de 7 pontos na criaÃ§Ã£o. Atual: ${totalPontos(state.vantagens)}, tentativa: +${pontos}.`);
      return;
    }
    state.vantagens.push({ nome: catalogo.nome, categoria: catalogo.categoria, pontos, detalhe: valor("vantagemDetalhe"), resumo: catalogo.resumo });
    preencher("vantagemDetalhe", "");
  }

  if (tipo === "defeito") {
    const catalogo = defeitosCatalogo[Number($("defeitoSelect").value)];
    const pontos = normalizarPontosCatalogo(catalogo, valor("defeitoPontos"));
    if (pontos === null) {
      return;
    }
    if (!adminEditandoFicha && excedeLimiteCriacao("defeito", pontos)) {
      alert(`Defeitos nÃ£o podem passar de 2 pontos na criaÃ§Ã£o. Atual: ${totalPontos(state.defeitos)}, tentativa: +${pontos}.`);
      return;
    }
    state.defeitos.push({ nome: catalogo.nome, categoria: catalogo.categoria, pontos, detalhe: valor("defeitoDetalhe"), resumo: catalogo.resumo });
    preencher("defeitoDetalhe", "");
  }

  if (tipo === "trunfo") {
    if (!adminEditandoFicha && state.trunfos.length >= 2) {
      alert("Você já escolheu dois Trunfos. Remova um deles para trocar.");
      return;
    }

    if (!adminEditandoFicha && state.distincoes.length > 0) {
      alert("Você escolheu o caminho de um Trunfo com Distinções. Remova as Distinções para pegar um segundo Trunfo.");
      return;
    }

    const catalogo = trunfosCatalogo[Number($("trunfoSelect").value)];
    state.trunfos.push({ nome: catalogo.nome, categoria: catalogo.categoria, detalhe: valor("trunfoDetalhe"), resumo: catalogo.resumo });
    preencher("trunfoDetalhe", "");
  }

  if (tipo === "distincao") {
    if (state.trunfos.length < 1) {
      alert("Adicione um Trunfo antes de adicionar DistinÃ§Ãµes.");
      return;
    }

    if (!adminEditandoFicha && state.trunfos.length !== 1) {
      alert("Distinções só ficam disponíveis quando a ficha tem exatamente um Trunfo.");
      return;
    }

    if (!adminEditandoFicha && state.distincoes.length >= 2) {
      alert("A criação permite no máximo duas Distinções.");
      return;
    }

    const opcoes = distincaoCatalogoPorTrunfo[state.trunfos[0].nome] || [];
    const escolhida = opcoes[Number($("distincaoSelect").value)];
    if (!escolhida) {
      alert("Escolha uma Distinção válida para o Trunfo selecionado.");
      return;
    }

    state.distincoes.push({
      nome: escolhida[0],
      categoria: "Distinção",
      trunfo: state.trunfos[0].nome,
      detalhe: valor("distincaoDetalhe"),
      resumo: escolhida[1]
    });
    preencher("distincaoDetalhe", "");
  }

  atualizarTudo();
  autoSalvar();
}

function removerItem(tipo, index) {
  if (fichaMecanicaTravada()) {
    alert("Ficha finalizada. Remoções só devem ocorrer criando nova ficha ou por ajuste narrativo do Narrador fora desta trava.");
    return;
  }

  const mapa = {
    vantagem: state.vantagens,
    defeito: state.defeitos,
    trunfo: state.trunfos,
    distincao: state.distincoes
  };

  mapa[tipo].splice(index, 1);
  atualizarTudo();
  autoSalvar();
}

function validarFicha() {
  const erros = [];
  const avisos = [];

  if (state.finalizada) {
    return { erros, avisos };
  }

  const attrIds = todosAtributos.map(([id]) => id);
  const skillIds = todasHabilidades.map(([id]) => id);
  const contagemAtributos = contarPorValor(attrIds);
  const dist = distribuicoesHabilidades[valor("distribuicaoHabilidades")];
  const contagemHabilidades = contarPorValor(skillIds);

  ["nomePersonagem", "conceito", "ambicao", "credo", "impeto"].forEach((id) => {
    if (!valor(id)) {
      erros.push(`Preencha ${labelDoCampo(id)}.`);
    }
  });

  if (![valor("pilar1"), valor("pilar2"), valor("pilar3")].filter(Boolean).length) {
    erros.push("Informe ao menos um Pilar.");
  }

  if ((contagemAtributos[4] || 0) !== 1 || (contagemAtributos[3] || 0) !== 3 || (contagemAtributos[2] || 0) !== 4 || (contagemAtributos[1] || 0) !== 1) {
    erros.push("Atributos devem seguir a distribuição: um 4, três 3, quatro 2 e um 1.");
  }

  [4, 3, 2, 1].forEach((nivel) => {
    if ((contagemHabilidades[nivel] || 0) !== dist[nivel]) {
      erros.push(`Habilidades de nível ${nivel}: esperado ${dist[nivel]}, atual ${contagemHabilidades[nivel] || 0}.`);
    }
  });

  if (!valor("especializacaoLivre")) {
    avisos.push("A especialização gratuita ainda não foi preenchida.");
  }

  [
    ["ciencia", "especializacaoCiencia", "Ciência"],
    ["academicos", "especializacaoAcademicos", "Acadêmicos"],
    ["oficios", "especializacaoOficios", "Ofícios"],
    ["performance", "especializacaoPerformance", "Performance"]
  ].forEach(([skillId, specId, nome]) => {
    if (valor(skillId) > 0 && !valor(specId)) {
      avisos.push(`${nome} tem pontos e recebe uma especialização gratuita.`);
    }
  });

  if (totalPontos(state.vantagens) !== 7) {
    erros.push(`Vantagens devem somar 7 pontos na criação. Atual: ${totalPontos(state.vantagens)}.`);
  }

  if (totalPontos(state.defeitos) !== 2) {
    erros.push(`Defeitos devem somar 2 pontos na criação. Atual: ${totalPontos(state.defeitos)}.`);
  }

  const trunfoValido = (state.trunfos.length === 2 && state.distincoes.length === 0) || (state.trunfos.length === 1 && state.distincoes.length === 2);
  if (!trunfoValido && !state.finalizada) {
    erros.push("Escolha dois Trunfos, ou um Trunfo e duas Distinções.");
  }

  if (state.trunfos.length === 1 && state.distincoes.some((distincao) => distincao.trunfo && distincao.trunfo !== state.trunfos[0].nome)) {
    erros.push("Todas as Distinções precisam pertencer ao Trunfo escolhido.");
  }

  if (state.trunfos.length >= 2 && state.distincoes.length > 0) {
    erros.push("Ao escolher dois Trunfos, não selecione Distinções.");
  }

  return { erros, avisos };
}

function labelDoCampo(id) {
  const labels = {
    nomePersonagem: "Nome do Caçador",
    conceito: "Conceito",
    ambicao: "Ambição",
    credo: "Credo",
    impeto: "Ímpeto"
  };
  return labels[id] || id;
}

function atualizarMedidores() {
  const contagemAtributos = contarPorValor(todosAtributos.map(([id]) => id));
  const dist = distribuicoesHabilidades[valor("distribuicaoHabilidades")];
  const contagemHabilidades = contarPorValor(todasHabilidades.map(([id]) => id));
  const vants = totalPontos(state.vantagens);
  const defs = totalPontos(state.defeitos);

  $("resumoAtributos").innerHTML = `
    <span class="${(contagemAtributos[4] || 0) === 1 ? "ok" : "erro"}">4: ${contagemAtributos[4] || 0}/1</span><br>
    <span class="${(contagemAtributos[3] || 0) === 3 ? "ok" : "erro"}">3: ${contagemAtributos[3] || 0}/3</span><br>
    <span class="${(contagemAtributos[2] || 0) === 4 ? "ok" : "erro"}">2: ${contagemAtributos[2] || 0}/4</span><br>
    <span class="${(contagemAtributos[1] || 0) === 1 ? "ok" : "erro"}">1: ${contagemAtributos[1] || 0}/1</span>
  `;

  $("resumoHabilidades").innerHTML = [4, 3, 2, 1].map((nivel) => {
    const atual = contagemHabilidades[nivel] || 0;
    return `<span class="${atual === dist[nivel] ? "ok" : "erro"}">Nível ${nivel}: ${atual}/${dist[nivel]}</span>`;
  }).join(" | ");

  $("resumoVantagens").innerHTML = `
    <span class="${vants === 7 ? "ok" : "erro"}">Vantagens: ${vants}/7</span><br>
    <span class="${defs === 2 ? "ok" : "erro"}">Defeitos: ${defs}/2</span>
  `;

  $("resumoTrunfos").innerHTML = `
    <span>Trunfos: ${state.trunfos.length}</span><br>
    <span>Distinções: ${state.distincoes.length}</span>
  `;

  $("resumoXp").innerHTML = `
    <span>Total: ${state.xpTotal}</span><br>
    <span>Gasto: ${state.xpGasto}</span><br>
    <span class="${xpDisponivel() >= 0 ? "ok" : "erro"}">Disponível: ${xpDisponivel()}</span>
  `;

  $("estadoFicha").textContent = state.finalizada ? "Finalizada" : "Em criação";
  $("vitalidadeResumo").textContent = String(totalCaixasVitalidade());
  $("vontadeResumo").textContent = String(totalCaixasVontade());
  $("xpDisponivelResumo").textContent = String(xpDisponivel());
  $("alertaTrava").hidden = !state.finalizada;
}

function atualizarControlesCatalogo() {
  atualizarDescricaoCatalogo("vantagem");
  atualizarDescricaoCatalogo("defeito");
  atualizarDescricaoCatalogo("trunfo");
  popularDistincoes();

  const semTrunfoParaDistincao = state.trunfos.length !== 1;
  const caminhoDoisTrunfos = state.trunfos.length >= 2;
  const limiteDistincoes = state.distincoes.length >= 2;
  const caminhoComDistincoes = state.distincoes.length > 0;
  const vantagemPassaLimite = excedeLimiteCriacao("vantagem", pontosSelecionadosPorTipo("vantagem"));
  const defeitoPassaLimite = excedeLimiteCriacao("defeito", pontosSelecionadosPorTipo("defeito"));

  $("adicionarVantagem").disabled = fichaMecanicaTravada() || (!adminEditandoFicha && (vantagemPassaLimite || totalPontos(state.vantagens) >= 7));
  $("adicionarDefeito").disabled = fichaMecanicaTravada() || (!adminEditandoFicha && (defeitoPassaLimite || totalPontos(state.defeitos) >= 2));
  $("adicionarTrunfo").disabled = fichaMecanicaTravada() || (!adminEditandoFicha && (state.trunfos.length >= 2 || caminhoComDistincoes));
  $("distincaoSelect").disabled = fichaMecanicaTravada() || (!adminEditandoFicha && (semTrunfoParaDistincao || caminhoDoisTrunfos || limiteDistincoes));
  $("distincaoDetalhe").disabled = $("distincaoSelect").disabled;
  $("adicionarDistincao").disabled = $("distincaoSelect").disabled;
}

function atualizarValidacao() {
  const { erros, avisos } = validarFicha();
  const linhas = [];

  if (!erros.length && !avisos.length) {
    linhas.push("<div class=\"ok\">Ficha pronta para finalizar.</div>");
  } else {
    erros.forEach((erro) => linhas.push(`<div class="erro">${erro}</div>`));
    avisos.forEach((aviso) => linhas.push(`<div class="aviso">${aviso}</div>`));
  }

  $("validacaoFicha").innerHTML = linhas.join("");
}

function atualizarTrava() {
  const travar = fichaMecanicaTravada();

  document.querySelectorAll("[data-field]").forEach((campo) => {
    const ficaEmExtras = Boolean(campo.closest?.('[data-step="extras"]'));
    campo.disabled = travar && !ficaEmExtras;
  });

  ["adicionarVantagem", "adicionarDefeito", "adicionarTrunfo", "adicionarDistincao", "finalizarFicha"].forEach((id) => {
    $(id).disabled = travar;
  });

  $("salvarFicha").disabled = !authUser || modoTela === "admin";
  $("novaFicha").disabled = false;
  $("exportarJson").disabled = false;
  $("exportarTxt").disabled = false;
  $("importarJsonBtn").disabled = false;
}

function montarFicha() {
  const ficha = {
    sistema: "Caçador: A Revanche 5ª Edição",
    estado: {
      finalizada: state.finalizada,
      ultimaAtualizacao: new Date().toISOString()
    },
    identidade: {
      nome: valor("nomePersonagem"),
      jogador: valor("nomeJogador"),
      cronica: valor("cronica"),
      narrador: valor("narrador"),
      conceito: valor("conceito"),
      celula: valor("celula"),
      ambicao: valor("ambicao"),
      desejo: valor("desejo")
    },
    cacador: {
      credo: valor("credo"),
      impeto: valor("impeto"),
      descricaoImpeto: valor("descricaoImpeto")
    },
    pilares: [valor("pilar1"), valor("pilar2"), valor("pilar3")].filter(Boolean),
    atributos: objetoPorGrupos(atributos),
    habilidades: objetoPorGrupos(habilidades),
    estados: {
      vitalidadeCaixas: totalCaixasVitalidade(),
      forcaDeVontadeCaixas: totalCaixasVontade(),
      xpTotal: state.xpTotal,
      xpGasto: state.xpGasto,
      xpDisponivel: xpDisponivel()
    },
    especializacoes: {
      livre: valor("especializacaoLivre"),
      ciencia: valor("especializacaoCiencia"),
      academicos: valor("especializacaoAcademicos"),
      oficios: valor("especializacaoOficios"),
      performance: valor("especializacaoPerformance")
    },
    vantagens: state.vantagens,
    defeitos: state.defeitos,
    trunfos: state.trunfos,
    distincoes: state.distincoes,
    mapaRelacionamentos: valor("mapaRelacionamentos"),
    equipamentos: {
      equipamentos: valor("equipamentos"),
      armas: valor("armas")
    },
    cacada: {
      presa: valor("presa"),
      local: valor("localCacada"),
      pistas: valor("pistas"),
      consequencias: valor("consequencias")
    },
    dano: {
      vitalidade: state.dano.vitalidade,
      vontade: state.dano.vontade
    },
    anotacoes: valor("anotacoes"),
    xpLog: state.xpLog,
    rolagens: state.rolagens
  };

  return ficha;
}

function objetoPorGrupos(grupos) {
  return grupos.reduce((acc, grupo) => {
    const chave = normalizarChave(grupo.grupo);
    acc[chave] = grupo.itens.reduce((itens, [id]) => {
      itens[id] = valor(id);
      return itens;
    }, {});
    return acc;
  }, {});
}

function normalizarChave(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function gerarTextoFicha(ficha) {
  const linha = "-".repeat(58);
  const blocoXp = modoTela === "criacao" ? "" : `
XP total: ${ficha.estados.xpTotal}
XP gasto: ${ficha.estados.xpGasto}
XP disponível: ${ficha.estados.xpDisponivel}`;

  return `
${linha}
CAÇADOR: A REVANCHE - 5ª EDIÇÃO
FICHA DE PERSONAGEM
${linha}

ESTADO
Status: ${ficha.estado.finalizada ? "Finalizada" : "Em criação"}${blocoXp}

IDENTIDADE
Nome: ${ficha.identidade.nome || "Não informado"}
Jogador: ${ficha.identidade.jogador || "Não informado"}
Crônica: ${ficha.identidade.cronica || "Não informado"}
Narrador: ${ficha.identidade.narrador || "Não informado"}
Conceito: ${ficha.identidade.conceito || "Não informado"}
Célula: ${ficha.identidade.celula || "Não informado"}
Ambição: ${ficha.identidade.ambicao || "Não informado"}
Desejo: ${ficha.identidade.desejo || "Não informado"}

CREDO E ÍMPETO
Credo: ${ficha.cacador.credo || "Não informado"}
Ímpeto: ${ficha.cacador.impeto || "Não informado"}
Descrição: ${ficha.cacador.descricaoImpeto || "Não informado"}

PILARES
${listaTexto(ficha.pilares)}

ATRIBUTOS
${blocoGrupo("Físicos", ficha.atributos.fisicos)}
${blocoGrupo("Sociais", ficha.atributos.sociais)}
${blocoGrupo("Mentais", ficha.atributos.mentais)}

ESTADOS DERIVADOS
Caixinhas de Vitalidade: ${ficha.estados.vitalidadeCaixas ?? ficha.estados.vitalidadeMaxima}
Caixinhas de Força de Vontade: ${ficha.estados.forcaDeVontadeCaixas ?? ficha.estados.forcaDeVontadeMaxima}
Vitalidade atual: ${textoTrilhaDano(ficha.dano?.vitalidade)}
Força de Vontade atual: ${textoTrilhaDano(ficha.dano?.vontade)}

HABILIDADES
${blocoGrupo("Físicas", ficha.habilidades.fisicas)}
${blocoGrupo("Sociais", ficha.habilidades.sociais)}
${blocoGrupo("Mentais", ficha.habilidades.mentais)}

ESPECIALIZAÇÕES
Livre: ${ficha.especializacoes.livre || "Nenhuma"}
Ciência: ${ficha.especializacoes.ciencia || "Nenhuma"}
Acadêmicos: ${ficha.especializacoes.academicos || "Nenhuma"}
Ofícios: ${ficha.especializacoes.oficios || "Nenhuma"}
Performance: ${ficha.especializacoes.performance || "Nenhuma"}

VANTAGENS
${listaItensComPontos(ficha.vantagens)}

DEFEITOS
${listaItensComPontos(ficha.defeitos)}

TRUNFOS
${listaItens(ficha.trunfos)}

DISTINÇÕES
${listaItens(ficha.distincoes)}

MAPA DE RELACIONAMENTOS
${ficha.mapaRelacionamentos || "Nenhum."}

EQUIPAMENTOS
${ficha.equipamentos.equipamentos || "Nenhum."}

ARMAS
${ficha.equipamentos.armas || "Nenhuma."}

A CAÇADA
Presa: ${ficha.cacada.presa || "Não informado"}
Local: ${ficha.cacada.local || "Não informado"}
Pistas: ${ficha.cacada.pistas || "Nenhuma."}
Consequências: ${ficha.cacada.consequencias || "Nenhuma."}

ANOTAÇÕES
${ficha.anotacoes || "Nenhuma."}
`.trim();
}

function blocoGrupo(titulo, grupo) {
  return `${titulo}\n${Object.entries(grupo).map(([id, valorItem]) => `${nomePorId(id)}: ${valorItem}`).join("\n")}`;
}

function nomePorId(id) {
  const encontrado = [...todosAtributos, ...todasHabilidades].find(([campoId]) => campoId === id);
  return encontrado ? encontrado[1] : id;
}

function listaTexto(lista) {
  return lista.length ? lista.map((item) => `- ${item}`).join("\n") : "Nenhum.";
}

function listaItensComPontos(lista) {
  return lista.length
    ? lista.map((item) => {
      const detalhe = item.detalhe ? ` - ${item.detalhe}` : "";
      const categoria = item.categoria ? ` [${item.categoria}]` : "";
      return `- ${item.nome} (${item.pontos})${categoria}${detalhe}${descricaoItemTexto(item)}`;
    }).join("\n")
    : "Nenhum.";
}

function listaItens(lista) {
  return lista.length
    ? lista.map((item) => {
      const detalhe = item.detalhe ? ` - ${item.detalhe}` : "";
      const categoria = item.categoria ? ` [${item.categoria}]` : "";
      const trunfo = item.trunfo ? ` - Trunfo: ${item.trunfo}` : "";
      return `- ${item.nome}${categoria}${trunfo}${detalhe}${descricaoItemTexto(item)}`;
    }).join("\n")
    : "Nenhum.";
}

function descricaoItemTexto(item) {
  return item.resumo ? `\n  DescriÃ§Ã£o: ${item.resumo}` : "";
}

function textoTrilhaDano(caixas) {
  if (!Array.isArray(caixas) || !caixas.length) {
    return "Sem dano marcado.";
  }

  return caixas.map((marcador) => marcador || "[ ]").join(" ");
}

function atualizarPrevia() {
  $("previewFicha").textContent = gerarTextoFicha(montarFicha());
}

function atualizarHistoricoXp() {
  $("historicoXp").innerHTML = state.xpLog.length
    ? state.xpLog.slice().reverse().map((item) => `<div>${item}</div>`).join("")
    : "<div>Nenhum XP registrado ainda.</div>";
}

function totalCaixasPorTrilha(trilha) {
  return trilha === "vitalidade" ? totalCaixasVitalidade() : totalCaixasVontade();
}

function nomeTrilha(trilha) {
  return trilha === "vitalidade" ? "Vitalidade" : "Forca de Vontade";
}

function normalizarDanoTrilha(trilha) {
  if (!state.dano || typeof state.dano !== "object") {
    state.dano = { vitalidade: [], vontade: [] };
  }

  const total = totalCaixasPorTrilha(trilha);
  const atual = Array.isArray(state.dano[trilha]) ? state.dano[trilha] : [];
  const normalizada = atual
    .slice(0, total)
    .map((marcador) => marcador === "/" || marcador === "X" ? marcador : "");

  while (normalizada.length < total) {
    normalizada.push("");
  }

  state.dano[trilha] = normalizada;
  return normalizada;
}

function contarDano(trilha) {
  const caixas = normalizarDanoTrilha(trilha);
  return {
    superficial: caixas.filter((item) => item === "/").length,
    agravado: caixas.filter((item) => item === "X").length,
    vazias: caixas.filter((item) => item === "").length,
    total: caixas.length
  };
}

function estaDebilitado(trilha) {
  return contarDano(trilha).vazias === 0;
}

function dadosDisponiveisTrilha(trilha) {
  const contagem = contarDano(trilha);
  return Math.max(0, contagem.total - contagem.agravado);
}

function proximoMarcadorDano(marcador) {
  if (marcador === "") {
    return "/";
  }
  if (marcador === "/") {
    return "X";
  }
  return "X";
}

function alternarCaixaDano(trilha, index) {
  normalizarDanoTrilha(trilha);
  if (state.dano[trilha][index] === "X") {
    alert("Dano agravado nÃ£o pode ser removido clicando na caixa. Use Medicina quando a regra permitir.");
    return;
  }
  state.dano[trilha][index] = proximoMarcadorDano(state.dano[trilha][index] || "");
  renderDano();
  atualizarControlesRolagem();
  autoSalvar();
}

function marcarNivelDano(trilha, marcador) {
  const caixas = normalizarDanoTrilha(trilha);
  const vazia = caixas.findIndex((item) => item === "");

  if (vazia !== -1) {
    caixas[vazia] = marcador;
    return true;
  }

  const superficial = caixas.findIndex((item) => item === "/");
  if (superficial !== -1) {
    caixas[superficial] = "X";
    return true;
  }

  return false;
}

function aplicarDano(trilha) {
  if (!state.finalizada) {
    alert("Finalize ou importe uma ficha antes de registrar dano.");
    return;
  }

  const quantidadeId = trilha === "vitalidade" ? "danoVitalidadeQuantidade" : "danoVontadeQuantidade";
  const tipoId = trilha === "vitalidade" ? "danoVitalidadeTipo" : "danoVontadeTipo";
  const recebido = Math.max(1, valor(quantidadeId));
  const tipo = valor(tipoId);
  const niveis = tipo === "superficial" ? Math.ceil(recebido / 2) : recebido;
  const marcador = tipo === "superficial" ? "/" : "X";

  let aplicados = 0;
  for (let i = 0; i < niveis; i += 1) {
    if (marcarNivelDano(trilha, marcador)) {
      aplicados += 1;
    }
  }

  renderDano();
  atualizarControlesRolagem();
  autoSalvar();

  if (!aplicados) {
    alert(`${nomeTrilha(trilha)} ja esta totalmente agravada.`);
  }
}

function removerSuperficial(trilha, quantidade) {
  const caixas = normalizarDanoTrilha(trilha);
  let removidos = 0;

  for (let i = caixas.length - 1; i >= 0 && removidos < quantidade; i -= 1) {
    if (caixas[i] === "/") {
      caixas[i] = "";
      removidos += 1;
    }
  }

  return removidos;
}

function comecarSessao() {
  if (!state.finalizada) {
    alert("Finalize ou importe uma ficha antes de recuperar dano.");
    return;
  }

  const vitalidade = removerSuperficial("vitalidade", valor("vigor"));
  const vontade = removerSuperficial("vontade", maiorRecuperacaoVontade());
  renderDano();
  atualizarControlesRolagem();
  autoSalvar();
  alert(`Comeco de sessao: ${vitalidade} dano(s) superficial(is) de Vitalidade e ${vontade} de Forca de Vontade recuperado(s).`);
}

function converterAgravadoEmSuperficial(trilha) {
  if (!state.finalizada) {
    alert("Finalize ou importe uma ficha antes de curar dano.");
    return false;
  }

  const caixas = normalizarDanoTrilha(trilha);
  const agravado = caixas.findIndex((item) => item === "X");
  if (agravado === -1) {
    alert(`Nao ha dano agravado de ${nomeTrilha(trilha)} para converter.`);
    return false;
  }

  caixas[agravado] = "/";
  renderDano();
  atualizarControlesRolagem();
  autoSalvar();
  return true;
}

function curarAgravadoVitalidade() {
  converterAgravadoEmSuperficial("vitalidade");
}

function curarAgravadoVontade() {
  converterAgravadoEmSuperficial("vontade");
}

function resumoDanoTexto(trilha) {
  const contagem = contarDano(trilha);
  const debilitado = estaDebilitado(trilha);
  const foraConflito = contagem.agravado >= contagem.total && contagem.total > 0;
  const partes = [
    `${contagem.superficial} superficial`,
    `${contagem.agravado} agravado`,
    `${dadosDisponiveisTrilha(trilha)} dado(s) disponiveis para rolagem de ${nomeTrilha(trilha)}`
  ];

  if (foraConflito) {
    partes.push("trilha totalmente agravada: fora do conflito");
  } else if (debilitado) {
    partes.push("debilitado: dano novo converte superficial em agravado");
  }

  return partes.join(" - ");
}

function renderTrilhaDano(trilha, containerId, estadoId) {
  const caixas = normalizarDanoTrilha(trilha);
  $(containerId).innerHTML = caixas.map((marcador, index) => {
    const classe = marcador === "X" ? "agravado" : marcador === "/" ? "superficial" : "";
    const texto = marcador || "";
    return `<button class="caixa-dano ${classe}" type="button" data-dano-trilha="${trilha}" data-dano-index="${index}" aria-label="${nomeTrilha(trilha)} caixa ${index + 1}">${texto}</button>`;
  }).join("");

  $(estadoId).textContent = resumoDanoTexto(trilha);
}

function renderDano() {
  renderTrilhaDano("vitalidade", "vitalidadeCaixas", "vitalidadeEstado");
  renderTrilhaDano("vontade", "vontadeCaixas", "vontadeEstado");

  $("danoResumoSessao").textContent = `Comeco de sessao: recupera ate ${valor("vigor")} superficial de Vitalidade e ate ${maiorRecuperacaoVontade()} superficial de Forca de Vontade.`;
  $("medicinaResumo").textContent = "Medicina: clique no botao quando o tratamento permitir converter 1 dano agravado de Vitalidade em superficial.";

  document.querySelectorAll("[data-dano-trilha]").forEach((botao) => {
    botao.addEventListener("click", () => alternarCaixaDano(botao.dataset.danoTrilha, Number(botao.dataset.danoIndex)));
  });
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function popularSelectCaracteristicas(select, itens) {
  select.innerHTML = "";
  itens.forEach(([id, nome]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = nome;
    select.appendChild(option);
  });
}

function popularSeletoresRolagem() {
  popularSelectCaracteristicas($("rolagemAtributo1"), todosAtributos);
  popularSelectCaracteristicas($("rolagemAtributo2"), todosAtributos);
  popularSelectCaracteristicas($("rolagemHabilidade"), todasHabilidades);
}

function textoBonusRolagem(bonus) {
  if (!bonus) {
    return "";
  }
  return bonus > 0 ? ` + bonus ${bonus}` : ` - bonus ${Math.abs(bonus)}`;
}

function calcularParadaRolagem() {
  const tipo = valor("rolagemTipo");
  const bonus = valor("rolagemBonus");
  let base = 0;
  let descricao = "";

  if (tipo === "atributoHabilidade") {
    const atributo = valor("rolagemAtributo1");
    const habilidade = valor("rolagemHabilidade");
    base = valor(atributo) + valor(habilidade);
    descricao = `${nomePorId(atributo)} ${valor(atributo)} + ${nomePorId(habilidade)} ${valor(habilidade)}`;
  } else if (tipo === "atributoAtributo") {
    const primeiro = valor("rolagemAtributo1");
    const segundo = valor("rolagemAtributo2");
    base = valor(primeiro) + valor(segundo);
    descricao = `${nomePorId(primeiro)} ${valor(primeiro)} + ${nomePorId(segundo)} ${valor(segundo)}`;
  } else if (tipo === "vitalidade") {
    const agravado = contarDano("vitalidade").agravado;
    base = dadosDisponiveisTrilha("vitalidade");
    descricao = `Vitalidade ${base} (${totalCaixasVitalidade()} caixas, ${agravado} agravada(s) desconsiderada(s))`;
  } else if (tipo === "vontade") {
    const agravado = contarDano("vontade").agravado;
    base = dadosDisponiveisTrilha("vontade");
    descricao = `Forca de Vontade ${base} (${totalCaixasVontade()} caixas, ${agravado} agravada(s) desconsiderada(s))`;
  }

  const total = Math.max(0, base + bonus);
  return {
    tipo,
    base,
    bonus,
    total,
    descricao: `${descricao}${textoBonusRolagem(bonus)}`
  };
}

function atualizarControlesRolagem() {
  const tipo = valor("rolagemTipo");
  const usaAtributo = tipo === "atributoHabilidade" || tipo === "atributoAtributo";
  const usaHabilidade = tipo === "atributoHabilidade";
  const usaSegundoAtributo = tipo === "atributoAtributo";
  const parada = calcularParadaRolagem();

  $("rolagemAtributo1Box").hidden = !usaAtributo;
  $("rolagemHabilidadeBox").hidden = !usaHabilidade;
  $("rolagemAtributo2Box").hidden = !usaSegundoAtributo;
  $("rolagemResumo").textContent = `Parada: ${parada.total} dados - ${parada.descricao}`;
}

function textoTipoRolagem(tipo) {
  const nomes = {
    atributoHabilidade: "Atributo + Habilidade",
    atributoAtributo: "Atributo + Atributo",
    vitalidade: "Vitalidade",
    vontade: "Forca de Vontade"
  };
  return nomes[tipo] || "Rolagem";
}

function rolarDados() {
  if (!state.finalizada) {
    alert("Finalize ou importe uma ficha antes de rolar dados.");
    return;
  }

  const parada = calcularParadaRolagem();
  if (parada.total <= 0) {
    alert("A parada precisa ter pelo menos 1 dado depois dos bonus.");
    return;
  }

  const dados = Array.from({ length: parada.total }, () => Math.floor(Math.random() * 10) + 1);
  const resultado = resultadoRolagem(dados);

  state.rolagens.push({
    data: new Date().toISOString(),
    tipo: parada.tipo,
    descricao: parada.descricao,
    totalDados: parada.total,
    ...resultado
  });

  renderRolagens();
  autoSalvar();
}

function formatarDataRolagem(data) {
  const dataObj = new Date(data);
  if (Number.isNaN(dataObj.getTime())) {
    return "";
  }
  return dataObj.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function renderRolagens() {
  $("historicoRolagens").innerHTML = state.rolagens.length
    ? state.rolagens.slice().reverse().map((item) => {
      const dados = Array.isArray(item.dados) ? item.dados : [];
      const sucessos = Number(item.sucessos || 0);
      const sucessosBase = Number(item.sucessosBase || 0);
      const sucessosExtras = Number(item.sucessosExtras || 0);
      const totalDados = Number(item.totalDados || dados.length);
      const resultado = sucessos > 0 ? "sucesso" : "falha";
      const critico = item.critico ? "sim" : "nao";
      return `
        <div>
          <strong>${escaparHtml(textoTipoRolagem(item.tipo))}</strong>
          <span>${escaparHtml(formatarDataRolagem(item.data))}</span>
          <span>${escaparHtml(item.descricao || "Rolagem")} - ${totalDados} dado(s)</span>
          <span>Dados: ${dados.map((dado) => `<b>${escaparHtml(dado)}</b>`).join(", ") || "nenhum"}</span>
          <span>Sucessos: <strong>${sucessos}</strong> (${sucessosBase} em 6+, +${sucessosExtras} por pares de 10) - Critico: ${critico} - Resultado: ${resultado}</span>
        </div>
      `;
    }).join("")
    : "<div>Nenhuma rolagem ainda.</div>";
}

function atualizarXpAlvos() {
  const tipo = valor("xpTipoGasto");
  const alvo = $("xpAlvo");
  alvo.innerHTML = "";

  let opcoes = [];
  if (tipo === "atributo") {
    opcoes = todosAtributos;
  } else if (tipo === "habilidade") {
    opcoes = todasHabilidades;
  } else if (tipo === "vantagem") {
    opcoes = vantagensCatalogo.map((item, index) => [String(index), item.nome]);
  } else if (tipo === "trunfo") {
    opcoes = trunfosCatalogo.map((item, index) => [String(index), item.nome]);
  } else {
    opcoes = [["novo", "Novo registro"]];
  }

  opcoes.forEach(([id, nome]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = nome;
    alvo.appendChild(option);
  });

  const pontos = $("xpGastoPontos");
  pontos.disabled = tipo !== "vantagem";
  pontos.value = tipo === "vantagem" ? pontos.value : "1";
  atualizarCustoXp();
}

function calcularCustoXp() {
  const tipo = valor("xpTipoGasto");
  const alvo = valor("xpAlvo");

  if (tipo === "atributo") {
    return (valor(alvo) + 1) * 5;
  }

  if (tipo === "habilidade") {
    return (valor(alvo) + 1) * 3;
  }

  if (tipo === "especializacao") {
    return 3;
  }

  if (tipo === "trunfo") {
    return 6;
  }

  if (tipo === "distincao") {
    return 3;
  }

  if (tipo === "vantagem") {
    return Math.max(1, valor("xpGastoPontos")) * 3;
  }

  return 0;
}

function atualizarCustoXp() {
  $("xpCustoCalculado").textContent = `Custo: ${calcularCustoXp()} XP`;
}

function registrarXp() {
  if (!state.finalizada) {
    alert("Finalize a ficha antes de registrar XP.");
    return;
  }

  const select = $("xpSituacao");
  const quantidade = select.value === "custom" ? Math.max(1, valor("xpGanhoQuantidade")) : Number(select.value);
  const obs = valor("xpGanhoObs");

  state.xpTotal += quantidade;
  state.xpLog.push(`+${quantidade} XP - ${select.options[select.selectedIndex].textContent}${obs ? ` - ${obs}` : ""}`);
  preencher("xpGanhoObs", "");
  atualizarTudo();
  autoSalvar();
}

function gastarXp() {
  if (!state.finalizada) {
    alert("Finalize a ficha antes de gastar XP.");
    return;
  }

  const custo = calcularCustoXp();
  if (custo > xpDisponivel()) {
    alert(`XP insuficiente. Custo: ${custo}, disponível: ${xpDisponivel()}.`);
    return;
  }

  const tipo = valor("xpTipoGasto");
  const alvo = valor("xpAlvo");
  const detalhe = valor("xpGastoDetalhe");
  let descricao = "";

  if (tipo === "atributo" || tipo === "habilidade") {
    const atual = valor(alvo);
    if (atual >= 5) {
      alert("Este valor já está no máximo 5.");
      return;
    }
    preencher(alvo, atual + 1);
    descricao = `${nomePorId(alvo)} aumentado para ${atual + 1}`;
  }

  if (tipo === "especializacao") {
    if (!detalhe) {
      alert("Informe a especialização comprada.");
      return;
    }
    const atual = valor("especializacaoLivre");
    preencher("especializacaoLivre", atual ? `${atual}; ${detalhe}` : detalhe);
    descricao = `Especialização comprada: ${detalhe}`;
  }

  if (tipo === "trunfo") {
    const catalogo = trunfosCatalogo[Number(alvo)];
    state.trunfos.push({ nome: detalhe || catalogo.nome, categoria: catalogo.categoria, detalhe, resumo: catalogo.resumo });
    descricao = `Novo Trunfo: ${detalhe || catalogo.nome}`;
  }

  if (tipo === "distincao") {
    if (!detalhe) {
      alert("Informe a distinção comprada.");
      return;
    }
    state.distincoes.push({ nome: detalhe, categoria: "Distinção", detalhe: "" });
    descricao = `Nova Distinção: ${detalhe}`;
  }

  if (tipo === "vantagem") {
    const catalogo = vantagensCatalogo[Number(alvo)];
    const pontos = Math.max(1, valor("xpGastoPontos"));
    state.vantagens.push({ nome: detalhe || catalogo.nome, categoria: catalogo.categoria, pontos, detalhe, resumo: catalogo.resumo });
    descricao = `Vantagem comprada: ${detalhe || catalogo.nome} (${pontos})`;
  }

  state.xpGasto += custo;
  state.xpLog.push(`-${custo} XP - ${descricao}`);
  preencher("xpGastoDetalhe", "");
  atualizarTudo();
  autoSalvar();
}

function finalizarFicha() {
  const { erros } = validarFicha();
  if (erros.length) {
    setEtapa("preview");
    atualizarValidacao();
    alert("Ainda há pendências antes de finalizar a ficha.");
    return;
  }

  state.finalizada = true;
  state.xpLog.push("Ficha finalizada. Evolução mecânica futura deve ser registrada por XP; Extras continuam livres.");
  mostrarApp("gerenciar", "preview");
  atualizarTudo();
  autoSalvar();
}

function salvarFicha() {
  salvarFichaOnline();
}

function autoSalvar() {
  if (salvandoOnline) {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(montarFicha()));
}

function carregarFicha(ficha) {
  const identidade = ficha.identidade || {};
  const cacador = ficha.cacador || {};

  preencher("nomePersonagem", identidade.nome);
  preencher("nomeJogador", identidade.jogador);
  preencher("cronica", identidade.cronica);
  preencher("narrador", identidade.narrador);
  preencher("conceito", identidade.conceito);
  preencher("celula", identidade.celula);
  preencher("ambicao", identidade.ambicao);
  preencher("desejo", identidade.desejo);
  preencher("credo", cacador.credo);
  preencher("impeto", cacador.impeto);
  preencher("descricaoImpeto", cacador.descricaoImpeto);

  (ficha.pilares || []).forEach((pilar, index) => preencher(`pilar${index + 1}`, pilar));

  carregarGrupo(ficha.atributos, atributos);
  carregarGrupo(ficha.habilidades, habilidades);
  carregarLegado(ficha);

  const especializacoes = ficha.especializacoes || {};
  preencher("especializacaoLivre", especializacoes.livre);
  preencher("especializacaoCiencia", especializacoes.ciencia);
  preencher("especializacaoAcademicos", especializacoes.academicos);
  preencher("especializacaoOficios", especializacoes.oficios);
  preencher("especializacaoPerformance", especializacoes.performance);

  state.finalizada = Boolean(ficha.estado?.finalizada);
  state.vantagens = ficha.vantagens || ficha.vantagensEDefeitos?.vantagensLista || [];
  state.defeitos = ficha.defeitos || ficha.vantagensEDefeitos?.defeitosLista || [];
  state.trunfos = ficha.trunfos instanceof Array ? ficha.trunfos : [];
  state.distincoes = ficha.distincoes || [];
  state.xpTotal = ficha.estados?.xpTotal || ficha.estados?.experiencia || 0;
  state.xpGasto = ficha.estados?.xpGasto || 0;
  state.xpLog = ficha.xpLog || [];
  state.rolagens = Array.isArray(ficha.rolagens) ? ficha.rolagens : [];
  state.dano = {
    vitalidade: Array.isArray(ficha.dano?.vitalidade) ? ficha.dano.vitalidade : [],
    vontade: Array.isArray(ficha.dano?.vontade) ? ficha.dano.vontade : []
  };

  preencher("mapaRelacionamentos", ficha.mapaRelacionamentos || ficha.vinculos?.mapaRelacionamentos);
  preencher("equipamentos", ficha.equipamentos?.equipamentos);
  preencher("armas", ficha.equipamentos?.armas);
  preencher("presa", ficha.cacada?.presa);
  preencher("localCacada", ficha.cacada?.local);
  preencher("pistas", ficha.cacada?.pistas);
  preencher("consequencias", ficha.cacada?.consequencias);
  preencher("anotacoes", ficha.anotacoes);

  atualizarTudo();
}

function carregarGrupo(dados, grupos) {
  if (!dados) {
    return;
  }
  grupos.forEach((grupo) => {
    const chave = normalizarChave(grupo.grupo);
    grupo.itens.forEach(([id]) => preencher(id, dados[chave]?.[id]));
  });
}

function carregarLegado(ficha) {
  const legadoSkills = ficha.habilidades;
  if (!legadoSkills) {
    return;
  }

  const fisicas = legadoSkills.fisicas || {};
  const sociais = legadoSkills.sociais || {};
  const mentais = legadoSkills.mentais || {};
  const mapa = {
    atletismo: fisicas.esportes,
    furtividade: fisicas.furto,
    percepcao: mentais.consciencia,
    politica: mentais.politica,
    oficios: fisicas.oficios,
    subterfugio: sociais.subterfugio
  };

  Object.entries(mapa).forEach(([id, novoValor]) => {
    if (novoValor !== undefined && valor(id) === 0) {
      preencher(id, novoValor);
    }
  });
}

function carregarFichaSalva() {
  const fichaSalva = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
  if (!fichaSalva) {
    atualizarTudo();
    return;
  }

  try {
    carregarFicha(JSON.parse(fichaSalva));
  } catch (erro) {
    console.error("Erro ao carregar ficha salva:", erro);
    atualizarTudo();
  }
}

function baixarArquivo(nomeArquivo, conteudo, tipo) {
  const arquivo = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

function nomeArquivoSeguro(nome) {
  return (nome || "ficha-cacador-a-revanche")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function exportarJSON() {
  const ficha = montarFicha();
  baixarArquivo(`${nomeArquivoSeguro(ficha.identidade.nome)}.json`, JSON.stringify(ficha, null, 2), "application/json");
}

function exportarTXT() {
  const ficha = montarFicha();
  baixarArquivo(`${nomeArquivoSeguro(ficha.identidade.nome)}.txt`, gerarTextoFicha(ficha), "text/plain");
}

function importarJSON(evento) {
  const arquivo = evento.target.files[0];
  if (!arquivo) {
    return;
  }

  const leitor = new FileReader();
  leitor.onload = function () {
    try {
      const ficha = JSON.parse(leitor.result);
      carregarFicha(ficha);
      if (!state.finalizada) {
        state.xpLog.push("Ficha importada e tratada como finalizada para uso em Prévia, XP e Extras.");
      }
      state.finalizada = true;
      mostrarApp("gerenciar", "preview");
      atualizarTudo();
      autoSalvar();
      alert("Ficha importada com sucesso.");
    } catch (erro) {
      alert("Erro: o arquivo JSON não parece ser uma ficha válida.");
      console.error(erro);
    }
    evento.target.value = "";
  };
  leitor.readAsText(arquivo);
}

function novaFicha() {
  const confirmar = confirm("Criar uma nova ficha? A ficha atual salva neste navegador será substituída.");
  if (!confirmar) {
    return;
  }

  iniciarCriacao();
}

function atualizarTudo() {
  atualizarModoInterface();
  renderListas();
  atualizarMedidores();
  atualizarValidacao();
  atualizarPrevia();
  atualizarHistoricoXp();
  renderDano();
  atualizarControlesRolagem();
  renderRolagens();
  atualizarXpAlvosPreservando();
  atualizarTrava();
  atualizarControlesCatalogo();
}

function atualizarXpAlvosPreservando() {
  const alvoAtual = $("xpAlvo").value;
  atualizarXpAlvos();
  if ([...$("xpAlvo").options].some((option) => option.value === alvoAtual)) {
    $("xpAlvo").value = alvoAtual;
  }
  atualizarCustoXp();
}

function inicializarEventos() {
  document.querySelectorAll("[data-step-target]").forEach((botao) => {
    botao.addEventListener("click", () => setEtapa(botao.dataset.stepTarget));
  });

  document.addEventListener("input", (evento) => {
    if (evento.target.matches("[data-field]")) {
      atualizarTudo();
      autoSalvar();
    }
  });

  $("salvarFicha").addEventListener("click", salvarFicha);
  $("finalizarFicha").addEventListener("click", finalizarFicha);
  $("novaFicha").addEventListener("click", novaFicha);
  $("voltarMenuTopo").addEventListener("click", mostrarMenu);
  $("criarFichaMenu").addEventListener("click", iniciarCriacao);
  $("importarFichaMenu").addEventListener("click", abrirFichasOnline);
  $("abrirFichasOnline").addEventListener("click", abrirFichasOnline);
  $("fecharFichasOnline").addEventListener("click", fecharFichasOnline);
  $("loginEmailMenu").addEventListener("click", loginEmail);
  $("criarContaEmail").addEventListener("click", criarContaEmail);
  $("loginEmailTopo").addEventListener("click", loginEmail);
  $("sairEmail").addEventListener("click", sairEmail);
  ["authEmailInput", "authSenhaInput"].forEach((id) => $(id).addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      loginEmail();
    }
  }));
  $("abrirAdminMenu").addEventListener("click", abrirAdmin);
  $("abrirAdmin").addEventListener("click", abrirAdmin);
  $("atualizarAdmin").addEventListener("click", atualizarAdmin);
  $("exportarJson").addEventListener("click", exportarJSON);
  $("exportarTxt").addEventListener("click", exportarTXT);
  $("importarJsonBtn").addEventListener("click", () => $("importarJsonInput").click());
  $("importarJsonInput").addEventListener("change", importarJSON);

  $("adicionarVantagem").addEventListener("click", () => adicionarItem("vantagem"));
  $("adicionarDefeito").addEventListener("click", () => adicionarItem("defeito"));
  $("adicionarTrunfo").addEventListener("click", () => adicionarItem("trunfo"));
  $("adicionarDistincao").addEventListener("click", () => adicionarItem("distincao"));

  $("vantagemSelect").addEventListener("change", () => ajustarPontosPorCatalogo("vantagem"));
  $("vantagemPontos").addEventListener("input", atualizarControlesCatalogo);
  $("defeitoSelect").addEventListener("change", () => ajustarPontosPorCatalogo("defeito"));
  $("defeitoPontos").addEventListener("input", atualizarControlesCatalogo);
  $("trunfoSelect").addEventListener("change", () => {
    atualizarDescricaoCatalogo("trunfo");
    popularDistincoes();
  });
  $("distincaoSelect").addEventListener("change", atualizarDescricaoDistincao);
  $("xpTipoGasto").addEventListener("change", atualizarXpAlvos);
  $("xpAlvo").addEventListener("change", atualizarCustoXp);
  $("xpGastoPontos").addEventListener("input", atualizarCustoXp);
  $("adicionarXp").addEventListener("click", registrarXp);
  $("gastarXp").addEventListener("click", gastarXp);
  $("rolagemTipo").addEventListener("change", atualizarControlesRolagem);
  $("rolagemAtributo1").addEventListener("change", atualizarControlesRolagem);
  $("rolagemAtributo2").addEventListener("change", atualizarControlesRolagem);
  $("rolagemHabilidade").addEventListener("change", atualizarControlesRolagem);
  $("rolagemBonus").addEventListener("input", atualizarControlesRolagem);
  $("rolarDados").addEventListener("click", rolarDados);
  $("atualizarRolagensPublicas").addEventListener("click", atualizarRolagensPublicasCronica);
  $("aplicarDanoVitalidade").addEventListener("click", () => aplicarDano("vitalidade"));
  $("aplicarDanoVontade").addEventListener("click", () => aplicarDano("vontade"));
  $("comecarSessao").addEventListener("click", comecarSessao);
  $("curarAgravadoVitalidade").addEventListener("click", curarAgravadoVitalidade);
  $("curarAgravadoVontade").addEventListener("click", curarAgravadoVontade);
  $("mestreRolarDados").addEventListener("click", mestreRolarDados);
  $("salvarMestreAnotacoes").addEventListener("click", salvarMestreAnotacoes);
  $("adicionarIniciativa").addEventListener("click", adicionarIniciativa);
  $("proximoTurno").addEventListener("click", proximoTurno);
  $("limparIniciativa").addEventListener("click", limparIniciativa);
}

function ajustarPontosPorCatalogo(tipo) {
  const catalogo = tipo === "vantagem"
    ? vantagensCatalogo[Number($("vantagemSelect").value)]
    : defeitosCatalogo[Number($("defeitoSelect").value)];
  const input = tipo === "vantagem" ? $("vantagemPontos") : $("defeitoPontos");
  input.min = String(catalogo.min);
  input.max = String(catalogo.max);
  input.value = String(catalogo.valores ? catalogo.valores[0] : catalogo.min);
  atualizarDescricaoCatalogo(tipo);
  atualizarControlesCatalogo();
}

async function inicializar() {
  try {
    await carregarCatalogo();
    criarGrupo($("atributosContainer"), atributos, "atributo");
    criarGrupo($("habilidadesContainer"), habilidades, "habilidade");
    popularSelectCatalogo($("vantagemSelect"), vantagensCatalogo);
    popularSelectCatalogo($("defeitoSelect"), defeitosCatalogo);
    popularTrunfos();
    popularSeletoresRolagem();
    ajustarPontosPorCatalogo("vantagem");
    ajustarPontosPorCatalogo("defeito");
    await inicializarSupabase();
    inicializarEventos();
    mostrarMenu();
  } catch (erro) {
    mostrarErroInicializacao(erro);
  }
}

inicializar();
