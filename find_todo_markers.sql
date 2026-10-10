-- Lessons that still contain a [[VERIFY: ...]] note (needs the client's confirmation before publishing)
select c.title as course, m.title as module, l.title as lesson
from lessons l join modules m on m.id = l.module_id join courses c on c.id = m.course_id
where l.content like '%[[VERIFY%'
order by c.title, m.order_index, l.order_index;

-- Lessons that still need a picture
select c.title as course, m.title as module, l.title as lesson
from lessons l join modules m on m.id = l.module_id join courses c on c.id = m.course_id
where l.content like '%Picture to be added%'
order by c.title, m.order_index, l.order_index;
