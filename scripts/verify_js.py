import re

def verify():
    with open("static/js/app.js", "r", encoding="utf-8") as f:
        content = f.read()

    # Simple check for balance of braces outside strings/comments
    # Strip multiline comments /* ... */
    cleaned = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    # Strip single line comments
    cleaned = re.sub(r'//.*', '', cleaned)

    lines = content.split('\n')
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    
    # Simple state machine
    i = 0
    line = 1
    col = 1
    in_str = None
    in_template_expr = []
    
    while i < len(content):
        c = content[i]
        
        if c == '\n':
            line += 1
            col = 0
            
        if in_str:
            if c == '\\':
                i += 1 # skip next
            elif in_str == '`':
                if c == '$' and i + 1 < len(content) and content[i + 1] == '{':
                    in_template_expr.append(len(stack))
                    i += 1
                    in_str = None
                elif c == '`':
                    in_str = None
            elif c == in_str:
                in_str = None
        else:
            if c == '/' and i + 1 < len(content) and content[i + 1] == '/':
                # Single line comment
                while i < len(content) and content[i] != '\n':
                    i += 1
                line += 1
                col = 0
            elif c == '/' and i + 1 < len(content) and content[i + 1] == '*':
                # Multi line comment
                i += 2
                while i + 1 < len(content) and not (content[i] == '*' and content[i + 1] == '/'):
                    if content[i] == '\n':
                        line += 1
                    i += 1
                i += 1 # on '/'
            elif c in ('"', "'", '`'):
                in_str = c
            elif c in '({[':
                stack.append((c, line, col))
            elif c in ')}]':
                if in_template_expr and c == '}' and len(stack) == in_template_expr[-1]:
                    in_template_expr.pop()
                    in_str = '`'
                else:
                    if not stack:
                        print(f"Error: extra closing {c} at line {line}:{col}")
                        return False
                    top, t_line, t_col = stack.pop()
                    if pairs[c] != top:
                        print(f"Error: mismatched {c} at line {line}:{col}, matches {top} at line {t_line}:{t_col}")
                        return False
        i += 1
        col += 1
        
    if stack:
        print(f"Error: unclosed {len(stack)} brackets. First unclosed: {stack[0]}")
        return False
        
    print("app.js syntax & bracket verification SUCCESSFUL!")
    return True

if __name__ == '__main__':
    verify()
