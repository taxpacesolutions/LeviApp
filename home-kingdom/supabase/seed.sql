-- =============================================================================
-- Home Kingdom: starting data. Safe to run more than once (does nothing if a
-- household already exists). Everything here is editable inside the app.
-- Nothing is marked completed and no dates are set.
-- =============================================================================

-- Built-in campfire questions (shared by every household, read-only).
insert into public.hk_campfire_questions (household_id, category, text_es, text_en, sort)
select null, q.category, q.es, q.en, q.sort
from (values
  ('know', '¿Qué es algo que siempre has querido aprender?', 'What is something you''ve always wanted to learn?', 1),
  ('know', '¿Cuál es tu recuerdo favorito de la infancia?', 'What is your favorite childhood memory?', 2),
  ('know', '¿Qué cosa pequeña te hace feliz?', 'What is something small that makes you happy?', 3),
  ('know', '¿Qué canción te recuerda una etapa bonita de tu vida?', 'What song reminds you of a happy time in your life?', 4),
  ('know', '¿Qué comida te hace sentir en casa?', 'What food makes you feel at home?', 5),
  ('appreciation', '¿Qué es algo que apreciaste de mí esta semana?', 'What is something you appreciated about me this week?', 1),
  ('appreciation', '¿Qué es algo que hicimos bien juntos?', 'What is one thing we did well together?', 2),
  ('appreciation', '¿Qué te hace sentir apoyado o apoyada?', 'What makes you feel supported?', 3),
  ('appreciation', '¿Qué momento reciente juntos te sacó una sonrisa?', 'What recent moment together made you smile?', 4),
  ('dreams', '¿A dónde te gustaría que viajáramos?', 'Where would you like us to travel?', 1),
  ('dreams', '¿Cómo sería tu fin de semana ideal?', 'What would your ideal weekend look like?', 2),
  ('dreams', '¿Qué meta te gustaría que alcanzáramos juntos?', 'What is one goal you''d like us to work toward?', 3),
  ('dreams', '¿Cómo te imaginas nuestra casa dentro de cinco años?', 'How do you picture our home in five years?', 4),
  ('communication', '¿Qué te ayuda a sentirte escuchado o escuchada?', 'What helps you feel heard?', 1),
  ('communication', '¿Cómo podemos hacer más fácil nuestra rutina diaria?', 'What is one way we can make our daily routine easier?', 2),
  ('communication', '¿Hay algo en lo que necesites más ayuda?', 'Is there something you need more help with?', 3),
  ('communication', '¿Cuál es la mejor forma de avisarte cuando necesito algo?', 'What''s the best way for me to tell you when I need something?', 4)
) as q(category, es, en, sort)
where not exists (select 1 from public.hk_campfire_questions where household_id is null);

do $$
declare
  hh  uuid;
  pid uuid;
  s   jsonb;
  proj record;
  task text;
  n   integer;
begin
  if exists (select 1 from public.hk_households) then
    raise notice 'Home Kingdom: household already exists, seed skipped.';
    return;
  end if;

  insert into public.hk_households (name) values ('Nuestro Reino') returning id, settings into hh, s;

  insert into public.hk_profiles (household_id, hero, display_name, role_title, avatar) values
    (hh, 'jessica', 'Jessica', 'La Planificadora',
     '{"hair":"long","hairColor":"brown","skin":"light","outfit":"rose","accessory":"clipboard","hat":"none"}'),
    (hh, 'mariano', 'Mariano', 'El Constructor',
     '{"hair":"short","hairColor":"black","skin":"tan","outfit":"blue","accessory":"hammer","hat":"bandana"}');

  -- Main quests. Each task is "size|title" (s = small, m = medium, l = large).
  for proj in
    select * from (values
      -- Jessica
      (1, 'jessica', 'Convertir el garaje en oficina flexible', 'Un espacio de trabajo cómodo y versátil donde hoy está el garaje.', 'workshop', 'garage',
       array['l|Vaciar y clasificar lo que hay en el garaje', 's|Medir el espacio y dibujar un plano sencillo',
             'm|Decidir las zonas: escritorio, almacenaje y espacio libre', 'm|Revisar la iluminación y los enchufes necesarios',
             's|Hacer la lista de materiales y muebles', 'm|Conseguir escritorio y estanterías',
             'l|Limpiar, pintar y montar la zona de trabajo']),
      (2, 'jessica', 'Renovar y pintar el patio trasero', 'Dar vida nueva al patio con pintura fresca.', 'garden', 'patio',
       array['s|Revisar el estado actual', 's|Medir el área', 's|Elegir los colores de pintura',
             's|Hacer la lista de materiales', 'm|Comprar los materiales', 'l|Preparar y limpiar las superficies',
             'l|Pintar postes, vigas y techo inferior', 's|Recoger y tomar fotos del resultado']),
      (3, 'jessica', 'Cambiar las puertas interiores', 'Puertas nuevas para las habitaciones.', 'door', 'door',
       array['s|Contar las puertas y medir cada marco', 's|Elegir estilo y color',
             'm|Comparar precios y presupuesto', 'm|Comprar puertas y herrajes',
             'm|Retirar las puertas viejas', 'l|Instalar y ajustar las puertas nuevas']),
      (4, 'jessica', 'Instalar o cambiar los zócalos', 'Zócalos nuevos para un acabado limpio.', 'window_boxes', 'ruler',
       array['s|Medir los metros lineales de cada habitación', 's|Elegir material y altura del zócalo',
             'm|Comprar zócalos, clavos y masilla', 'm|Retirar los zócalos viejos donde haga falta',
             'l|Cortar e instalar los zócalos', 'm|Masillar, lijar y pintar']),
      (5, 'jessica', 'Cambiar el suelo interior', 'Suelo nuevo para las zonas que lo necesitan.', 'welcome_mat', 'floor',
       array['s|Decidir qué habitaciones incluir', 's|Medir los metros cuadrados',
             'm|Elegir el tipo de suelo y pedir muestras', 'm|Pedir presupuestos o calcular el costo',
             's|Planear dónde mover los muebles durante la obra', 'l|Retirar el suelo viejo y preparar la base',
             'l|Instalar el suelo nuevo']),
      (6, 'jessica', 'Limpieza profunda y organización de la casa', 'Una casa ordenada y fresca, zona por zona.', 'banner', 'broom',
       array['s|Hacer una lista de zonas por limpiar', 'm|Separar cosas para donar, guardar o tirar',
             'm|Limpieza profunda de la cocina', 'm|Limpieza profunda de los baños',
             'm|Organizar armarios y clósets', 's|Llevar las donaciones']),
      -- Mariano
      (7, 'mariano', 'Organizar herramientas y equipo', 'Cada herramienta en su lugar y fácil de encontrar.', 'tool_rack', 'hammer',
       array['m|Reunir todas las herramientas en un solo lugar', 's|Separar lo que no sirve o está repetido',
             's|Elegir sistema de almacenaje (tablero, cajas, estantes)', 'm|Instalar el tablero o los estantes',
             's|Etiquetar cajas y cajones']),
      (8, 'mariano', 'Organizar el espacio para proyectos de vehículos', 'Un rincón seguro y práctico para trabajar en vehículos.', 'cart', 'wrench',
       array['s|Definir el área de trabajo', 'm|Despejar y limpiar el suelo', 'm|Organizar repuestos y líquidos',
             's|Preparar iluminación y extensión eléctrica', 's|Tener a mano extintor y botiquín']),
      (9, 'mariano', 'Evaluar mejoras del cobertizo o más almacenaje', 'Decidir si reparar, ampliar o sumar almacenaje.', 'barn', 'shed',
       array['s|Revisar el estado del cobertizo actual', 's|Hacer inventario de lo que se guarda ahí',
             'm|Investigar opciones: reparar, ampliar o comprar', 's|Calcular un presupuesto aproximado',
             's|Decidir juntos la mejor opción']),
      (10, 'mariano', 'Planear el trabajo eléctrico de las renovaciones', 'Saber qué trabajo eléctrico hará falta antes de empezar.', 'lamps', 'bolt',
       array['m|Listar enchufes, luces e interruptores necesarios', 's|Revisar el panel eléctrico y su capacidad',
             'm|Dibujar un plano eléctrico sencillo', 'm|Pedir presupuesto a un electricista con licencia',
             's|Averiguar si hacen falta permisos']),
      -- Shared
      (11, 'both', 'Cambiar el concreto de la entrada de autos', 'Reemplazar el concreto actual de la entrada.', 'stone_path', 'road',
       array['s|Medir la entrada actual', 'm|Pedir tres presupuestos', 's|Revisar los permisos necesarios',
             's|Elegir contratista y fecha', 'm|Despejar la entrada antes de la obra', 's|Revisar el trabajo terminado']),
      (12, 'both', 'Ampliar la entrada de autos', 'Más espacio para estacionar.', 'wide_road', 'road',
       array['s|Decidir el nuevo tamaño y forma', 's|Revisar los límites del terreno y las normas',
             's|Marcar el área con estacas o pintura', 's|Incluir la ampliación en los presupuestos',
             'l|Preparar el terreno']),
      (13, 'both', 'Construir una pequeña terraza junto al cobertizo', 'Un deck de madera para descansar al aire libre.', 'deck', 'deck',
       array['s|Elegir la ubicación y el tamaño', 'm|Dibujar un diseño sencillo', 's|Hacer la lista de madera y tornillería',
             'm|Comprar los materiales', 'l|Nivelar el terreno y poner la base', 'l|Montar la estructura y las tablas',
             'm|Sellar o pintar la madera']),
      (14, 'both', 'Mejorar el exterior de la casa', 'Pequeñas mejoras que hacen lucir la casa.', 'fence', 'house',
       array['s|Dar una vuelta a la casa y anotar ideas', 's|Elegir prioridades: pintura, jardín, luces…',
             'm|Limpiar la fachada y las ventanas', 'm|Arreglar detalles pequeños',
             'm|Plantar o arreglar las plantas del frente']),
      (15, 'both', 'Definir presupuesto y prioridades de renovación', 'Un plan claro de qué hacer primero y cuánto gastar.', 'chest', 'coins',
       array['s|Listar todos los proyectos pendientes', 'm|Estimar el costo de cada proyecto',
             's|Definir un presupuesto mensual', 's|Ordenar los proyectos por prioridad',
             's|Acordar una revisión mensual del plan'])
    ) as v(sort, assignee, title, description, unlock_key, icon, tasks)
  loop
    insert into public.hk_projects (household_id, kind, title, description, assignee, priority,
                                    reward_gold, reward_xp, unlock_key, icon, sort)
      values (hh, 'main', proj.title, proj.description, proj.assignee, 'medium',
              (s->>'project_gold')::int, (s->>'project_xp')::int, proj.unlock_key, proj.icon, proj.sort)
      returning id into pid;
    n := 0;
    foreach task in array proj.tasks loop
      n := n + 1;
      insert into public.hk_tasks (project_id, title, assignee, size, reward_gold, reward_xp, sort)
        values (pid, substr(task, 3), proj.assignee,
                case left(task, 1) when 'l' then 'large' when 'm' then 'medium' else 'small' end,
                (s->>(case left(task, 1) when 'l' then 'large' when 'm' then 'medium' else 'small' end || '_gold'))::int,
                (s->>(case left(task, 1) when 'l' then 'large' when 'm' then 'medium' else 'small' end || '_xp'))::int,
                n);
    end loop;
  end loop;

  -- Shop: kingdom decorations (instant) and real-life rewards (need the other's OK).
  insert into public.hk_shop_items (household_id, category, title, description, icon, price, requires_approval, unlock_key, sort) values
    (hh, 'virtual', 'Flores para el reino', 'Un macizo de flores de colores.', 'flowerbed', 40, false, 'flowerbed', 1),
    (hh, 'virtual', 'Árbol decorativo', 'Un árbol frondoso junto a la casa.', 'tree', 60, false, 'tree', 2),
    (hh, 'virtual', 'Banco de jardín', 'Para sentarse a mirar el reino.', 'bench', 50, false, 'bench', 3),
    (hh, 'virtual', 'Buzón', 'Un buzón rojo en la entrada.', 'mailbox', 30, false, 'mailbox', 4),
    (hh, 'virtual', 'Techo azul', 'Pinta el techo de azul.', 'roof_blue', 80, false, 'roof_blue', 5),
    (hh, 'virtual', 'Techo verde', 'Pinta el techo de verde.', 'roof_green', 80, false, 'roof_green', 6),
    (hh, 'virtual', 'Gatito', 'Un gato que toma el sol.', 'cat', 120, false, 'cat', 7),
    (hh, 'virtual', 'Perrito', 'Un perro guardián muy amistoso.', 'dog', 120, false, 'dog', 8),
    (hh, 'virtual', 'Pequeña fuente', 'Una fuente de piedra con agua.', 'fountain', 150, false, 'fountain', 9),
    (hh, 'real', 'Elegir la película de esta noche', '', 'movie', 40, true, null, 1),
    (hh, 'real', 'Desayuno casero favorito', 'La otra persona prepara tu desayuno favorito.', 'breakfast', 60, true, null, 2),
    (hh, 'real', 'Una hora de tiempo personal', 'Una hora sin interrupciones para ti.', 'clock', 80, true, null, 3),
    (hh, 'real', 'Un antojo pequeño acordado', '', 'treat', 50, true, null, 4),
    (hh, 'real', 'Elegir el plan del fin de semana', '', 'sun', 120, true, null, 5),
    (hh, 'real', 'Noche de cita en casa', '', 'heart', 150, true, null, 6),
    (hh, 'real', 'Elegir el restaurante', '', 'food', 150, true, null, 7),
    (hh, 'real', 'Salida especial juntos', '', 'star', 250, true, null, 8);

  raise notice 'Home Kingdom: household created.';
end $$;
