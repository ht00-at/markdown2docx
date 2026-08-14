function normalizeMarkdown(content) {
    var lines = content.split('\n');
    var result = [];
    var i = 0;
    var len = lines.length;

    function isTableLine(l) { return /^\|.+\|[\s]*$/.test(l); }
    function isSepLine(l) { return /^\|[\s\-:.\|]+$/.test(l); }

    while (i < len) {
        var line = lines[i];
        var empty = line.trim() === '';

        if (empty) {
            result.push(line);
            i++;
            continue;
        }

        if (isTableLine(line) && !isSepLine(line)) {
            // Collect the entire contiguous pipe-table block
            var block = [];
            var j = i;
            while (j < len && (isTableLine(lines[j]) || isSepLine(lines[j]))) {
                block.push(lines[j]);
                j++;
            }

            // Only process if there are separator line(s)
            var hasSep = block.some(function(l) { return isSepLine(l); });
            if (hasSep) {
                // Split into proper tables using separator lines as delimiters
                var rebuilt = splitBlock(block);
                // Ensure leading blank line
                if (result.length > 0 && result[result.length - 1] !== '') {
                    result.push('');
                }
                for (var k = 0; k < rebuilt.length; k++) {
                    result.push(rebuilt[k]);
                }
                // Ensure trailing blank line
                if (j < len && lines[j].trim() !== '') {
                    result.push('');
                }
            } else {
                result.push(line);
            }
            i = j;
            continue;
        }

        result.push(line);
        i++;
    }

    return cleanResult(result);
}

function splitBlock(block) {
    var sepIdx = [];
    for (var i = 0; i < block.length; i++) {
        if (/^\|[\s\-:.\|]+$/.test(block[i])) {
            sepIdx.push(i);
        }
    }

    if (sepIdx.length === 0) return block;
    if (sepIdx.length === 1) return block;

    var out = [];
    var ptr = 0;

    for (var s = 0; s < sepIdx.length; s++) {
        var sep = sepIdx[s];
        var dataEnd;

        if (s + 1 < sepIdx.length) {
            // Next table's header = line just before next separator
            dataEnd = sepIdx[s + 1] - 1;
        } else {
            // Last table: include all remaining lines
            dataEnd = block.length;
        }

        if (dataEnd > ptr) {
            if (out.length > 0) {
                out.push('');
            }
            for (var k = ptr; k < dataEnd; k++) {
                out.push(block[k]);
            }
        }

        ptr = dataEnd;
    }

    return out.length > 0 ? out : block;
}

function cleanResult(lines) {
    // Remove trailing empty lines (keep at most one)
    var i = lines.length - 1;
    while (i >= 0 && lines[i] === '') i--;
    i++;
    while (i < lines.length && lines[i] === '') i++;
    return lines.slice(0, Math.max(i, 0)).join('\n');
}

module.exports = { normalizeMarkdown };
