function Table(tbl)
  local raw = [[
    <w:tblBorders>
      <w:top w:val="single" w:sz="12" w:space="0" w:color="000000"/>
      <w:bottom w:val="single" w:sz="12" w:space="0" w:color="000000"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
    </w:tblBorders>
  ]]
  tbl.attributes['custom-style'] = nil
  table.insert(tbl.content, 1, pandoc.RawBlock('openxml', raw))
  return tbl
end
