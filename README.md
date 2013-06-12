jawk
====

Interpreter for jawk, an awk-like data proccessing language with JavaScript syntax.

Dedication
----------

jawk is dedicated to [Paul Inman](http://blogs.popart.com/author/paulinman), a gentleman and a scholar and,
most importantly, a lover of [awk](http://www.gnu.org/software/gawk/manual/gawk.html).

What jawk Isn't
---------------

jawk is not a drop-in replacement for awk; what would be the point of that?  Instead, jawk takes the basic
concept of awk (a terse, data-driven language), and implements that with JavaScript syntax.  If you use
JavavScript every day (and if you work in the web world, you probably do), and you love awk, and you're tired
of remembering a million syntactic idiosyncracies, well, jawk just might be for you.

What's Working
--------------

This list represents a high-level punch-list of what functionality has been implemented.

- BEGIN and END rules
- Regular expression rules
- RS variable
- Field variables ($0 - $n and NF)
- NR and RS variables
- printf support

What's Not Working
------------------

- stdin input
- Multi-line functions
- Expression rules (`$1='foo' { print() }`)

