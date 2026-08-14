function Math(m)
  if m.mathtype == 'InlineMath' then
    return m
  elseif m.mathtype == 'DisplayMath' then
    return m
  end
end

function Para(el)
  for i = #el.content, 1, -1 do
    if el.content[i].t == 'Math' and el.content[i].mathtype == 'DisplayMath' then
      if i > 1 and el.content[i-1].t == 'SoftBreak' then
        table.remove(el.content, i-1)
      end
    end
  end
  return el
end
