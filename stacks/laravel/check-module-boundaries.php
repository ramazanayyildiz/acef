#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Module boundary guard.
 *
 * Origin: JKM scripts/check-module-boundaries.php (PR #94, commit b1f605b83e65a527d447652d4e989fb88b770540; MIT
 * licence per that project's package manifest; see docs/slice-lane/SOURCES.md). Laravel adapter of the Slice lane
 * (stacks/laravel/); copied into slice-method v0.1.0 with one generalisation: --namespace=
 * (default App\Modules) so apps with another module namespace can use it unchanged. Behaviour is otherwise identical.
 *
 * Scans PHP files under app/Modules/<Name>/ and builds the module -> module
 * dependency graph from references to App\Modules\<Other>\. The graph is frozen
 * in scripts/module-boundaries.json (ratchet):
 *   - a NEW edge (not in the baseline) fails the check;
 *   - a STALE edge (in the baseline, no longer present) also fails, so removed
 *     dependencies are dropped from the baseline and can never come back unnoticed.
 *
 * Usage: php scripts/check-module-boundaries.php [--modules-dir=PATH] [--baseline=PATH] [--namespace=App\Modules] [--update-baseline] [--freeze-edge=From>To ...]
 *
 * Optional per-symbol ratchet: the baseline may carry "frozen_symbols": {"From>To": [FQCN, ...]}.
 * For a listed edge, every referenced App\Modules\To\... class must be in the list (new symbol
 * => violation) and every listed class must still be referenced (stale => ratchet down).
 * --freeze-edge=From>To (repeatable, with --update-baseline) starts freezing an edge.
 *
 * Exit codes: 0 clean, 1 violations found, 2 usage error.
 */
$root = dirname(__DIR__);
$modulesDir = $root.'/app/Modules';
$baselinePath = $root.'/scripts/module-boundaries.json';
$update = false;
$namespace = 'App\\Modules';
$freezeEdges = [];

foreach (array_slice($argv, 1) as $arg) {
    if (str_starts_with($arg, '--modules-dir=')) {
        $modulesDir = substr($arg, strlen('--modules-dir='));
    } elseif (str_starts_with($arg, '--baseline=')) {
        $baselinePath = substr($arg, strlen('--baseline='));
    } elseif (str_starts_with($arg, '--namespace=') && preg_match('/^\\\\?[A-Za-z_][A-Za-z0-9_]*(\\\\[A-Za-z_][A-Za-z0-9_]*)*$/', substr($arg, strlen('--namespace=')))) {
        $namespace = trim(substr($arg, strlen('--namespace=')), '\\');
    } elseif ($arg === '--update-baseline') {
        $update = true;
    } elseif (str_starts_with($arg, '--freeze-edge=') && preg_match('/^[A-Za-z0-9_]+>[A-Za-z0-9_]+$/', substr($arg, strlen('--freeze-edge=')))) {
        $freezeEdges[] = substr($arg, strlen('--freeze-edge='));
    } else {
        fwrite(STDERR, "Usage: php scripts/check-module-boundaries.php [--modules-dir=PATH] [--baseline=PATH] [--namespace=App\\Modules] [--update-baseline] [--freeze-edge=From>To ...]\n");
        exit(2);
    }
}

if (! is_dir($modulesDir)) {
    fwrite(STDERR, "Error: modules directory not found: {$modulesDir}\n");
    exit(2);
}
$modulesDir = rtrim($modulesDir, '/');

$seg = '[A-Za-z0-9_]+';
$bs = '\\\\{1,2}';
$nsParts = explode('\\', $namespace);
$nsDepth = count($nsParts);
$nsUse = implode('\\\\', array_map(static fn (string $p): string => preg_quote($p, '/'), $nsParts));
$core = implode($bs, array_map(static fn (string $p): string => preg_quote($p, '/'), $nsParts)).$bs.$seg.$bs.'(?:'.$seg.'(?:'.$bs.$seg.')*(?:'.$bs.')?)?';
$patterns = [
    'use_import' => '/^\s*use\s+(?:function\s+|const\s+)?\\\\?('.$core.')/',
    'inline_new' => '/\bnew\s+\\\\('.$core.')/',
    'static_call' => '/\\\\('.$core.')::/',
    'string_ref' => '/[\'"]\\\\{0,2}('.$core.')/',
    'instanceof' => '/\binstanceof\s+\\\\?('.$core.')/',
    // Catch-all (types, catch, attributes, ::class ...): a bare \App\Modules\X\... FQCN whose single leading
    // backslash is not preceded by a word char or another backslash. Listed last so the specific category wins.
    'inline_fqcn' => '/(?<![\w\\\\])\\\\('.$core.')/',
];

/** Collapse repeated backslashes, drop leading/trailing ones. */
$normalizeFqcn = static fn (string $raw): string => trim((string) preg_replace('/\\\\+/', '\\', $raw), '\\');

/** @var array<string, array<string, true>> $edges */
$edges = [];
/** @var array<string, list<array{string, int, string, string, string}>> $sources "From>To" => occurrences (path, line, category, code, fqcn) */
$sources = [];
$scanned = 0;

$seen = [];
$record = static function (string $module, string $fqcn, string $path, int $line, string $category, string $code) use (&$edges, &$sources, &$seen, $nsDepth): void {
    $key = "{$path}:{$line}:{$fqcn}";
    if (isset($seen[$key])) {
        return; // one occurrence is reported under the first matching category only
    }
    $seen[$key] = true;
    $target = explode('\\', $fqcn)[$nsDepth] ?? '';
    if ($target === '' || $target === $module) {
        return;
    }
    $edges[$module][$target] = true;
    $sources["{$module}>{$target}"][] = [$path, $line, $category, $code, $fqcn];
};

foreach (scandir($modulesDir) ?: [] as $entry) {
    if ($entry === '.' || $entry === '..' || ! is_dir($modulesDir.'/'.$entry)) {
        continue;
    }
    $edges[$entry] ??= [];
}

$iterator = new RecursiveIteratorIterator(
    new RecursiveCallbackFilterIterator(
        new RecursiveDirectoryIterator($modulesDir, FilesystemIterator::SKIP_DOTS),
        static fn (SplFileInfo $f): bool => ! ($f->isDir() && $f->getFilename() === 'vendor')
    )
);

foreach ($iterator as $file) {
    if (! $file->isFile() || $file->getExtension() !== 'php') {
        continue;
    }
    $relative = substr($file->getPathname(), strlen($modulesDir) + 1);
    $module = explode('/', $relative)[0];
    if (! str_contains($relative, '/')) {
        continue; // file directly in the modules dir, not part of a module
    }
    $scanned++;
    $lines = file($file->getPathname(), FILE_IGNORE_NEW_LINES) ?: [];
    $count = count($lines);
    for ($i = 0; $i < $count; $i++) {
        $line = $lines[$i];
        $trimmed = ltrim($line);
        if ($trimmed === '' || preg_match('/^(\/\/|\*|\/\*|#(?!\[)|\|)/', $trimmed)) {
            continue;
        }
        $startLine = $i + 1;
        $statement = $line;

        // Group use: join a multi-line `use App\Modules\X\{ ... }` into one statement.
        if (preg_match('/^\s*use\s+(?:function\s+|const\s+)?\\\\?'.$nsUse.'\\\\[A-Za-z0-9_]+\\\\(?:[A-Za-z0-9_]+\\\\)*\{[^}]*$/', $line)) {
            while ($i + 1 < $count && ! str_contains($statement, '}')) {
                $i++;
                $statement .= ' '.trim($lines[$i]);
            }
        }

        if (preg_match('/^\s*use\s+(?:function\s+|const\s+)?\\\\?('.$nsUse.'\\\\[A-Za-z0-9_]+\\\\(?:[A-Za-z0-9_]+\\\\)*)\{(.*)\}/s', $statement, $group)) {
            $prefix = $normalizeFqcn($group[1]);
            foreach (explode(',', $group[2]) as $member) {
                $member = trim((string) preg_replace('/\s+as\s+[A-Za-z0-9_]+$/i', '', trim($member)));
                $member = trim((string) preg_replace('/^(?:function|const)\s+/', '', $member));
                if ($member === '') {
                    continue;
                }
                $record($module, $prefix.'\\'.$normalizeFqcn($member), $file->getPathname(), $startLine, 'use_import', trim($line));
            }

            continue;
        }

        foreach ($patterns as $category => $regex) {
            if (! preg_match_all($regex, $statement, $matches)) {
                continue;
            }
            foreach ($matches[1] as $raw) {
                $record($module, $normalizeFqcn($raw), $file->getPathname(), $startLine, $category, trim($line));
            }
        }
    }
}

/** @return array<string, list<string>> */
$normalize = static function (array $graph): array {
    $out = [];
    foreach ($graph as $from => $targets) {
        $list = array_keys($targets);
        sort($list, SORT_STRING);
        $out[$from] = $list;
    }
    ksort($out, SORT_STRING);

    return $out;
};

$current = $normalize($edges);

$flatten = static function (array $graph): array {
    $flat = [];
    foreach ($graph as $from => $targets) {
        foreach ($targets as $to) {
            $flat["{$from}>{$to}"] = true;
        }
    }

    return $flat;
};

$comment = 'Frozen module -> module dependency graph (ratchet). '
    .'Never add an edge here without review. Regenerate with: php scripts/check-module-boundaries.php --update-baseline';

/** @return array<string, list<string>> edge => sorted unique referenced FQCNs */
$symbolsFor = static function (string $edge) use ($sources): array {
    $symbols = [];
    foreach ($sources[$edge] ?? [] as $occurrence) {
        $symbols[$occurrence[4]] = true;
    }
    $list = array_keys($symbols);
    sort($list, SORT_STRING);

    return $list;
};

if ($update) {
    $previous = [];
    $previousFrozen = [];
    if (is_file($baselinePath)) {
        $decoded = json_decode((string) file_get_contents($baselinePath), true);
        $previous = is_array($decoded['edges'] ?? null) ? $decoded['edges'] : [];
        $previousFrozen = is_array($decoded['frozen_symbols'] ?? null) ? $decoded['frozen_symbols'] : [];
    }
    $added = array_diff_key($flatten($current), $flatten($previous));

    $currentFlat = $flatten($current);
    $frozen = [];
    $addedSymbols = [];
    $freshlyFrozen = [];
    foreach (array_unique(array_merge(array_keys($previousFrozen), $freezeEdges)) as $edge) {
        if (! isset($currentFlat[$edge])) {
            if (in_array($edge, $freezeEdges, true)) {
                echo "WARNING: --freeze-edge ignored, edge not present in the tree: {$edge}\n";
            }

            continue; // a frozen edge that disappeared entirely is dropped
        }
        $symbols = $symbolsFor($edge);
        $frozen[$edge] = $symbols;
        if (isset($previousFrozen[$edge]) && is_array($previousFrozen[$edge])) {
            foreach (array_diff($symbols, $previousFrozen[$edge]) as $symbol) {
                $addedSymbols[] = [$edge, $symbol];
            }
        } else {
            $freshlyFrozen[$edge] = count($symbols);
        }
    }
    ksort($frozen, SORT_STRING);

    $payload = ['_comment' => $comment, 'edges' => $current];
    if ($frozen !== []) {
        $payload['frozen_symbols'] = $frozen;
    }
    $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    file_put_contents($baselinePath, $json."\n");

    echo "Module boundary baseline written: {$baselinePath} (".count($currentFlat)." edges, {$scanned} PHP files)\n";
    if ($added !== [] && $previous !== []) {
        echo 'WARNING: '.count($added)." edge(s) ADDED to the baseline - reviewers must approve each:\n";
        foreach (array_keys($added) as $edge) {
            echo '  + '.str_replace('>', ' -> ', $edge)."\n";
        }
    }
    foreach ($freshlyFrozen as $edge => $n) {
        echo "Frozen {$n} symbol(s) on edge ".str_replace('>', ' -> ', $edge)."\n";
    }
    if ($addedSymbols !== []) {
        echo 'WARNING: '.count($addedSymbols)." symbol(s) ADDED on frozen edges - reviewers must approve each:\n";
        foreach ($addedSymbols as [$edge, $symbol]) {
            echo '  + '.str_replace('>', ' -> ', $edge).": {$symbol}\n";
        }
    }
    exit(0);
}

if (! is_file($baselinePath)) {
    fwrite(STDERR, "Error: baseline file not found: {$baselinePath}\nCreate it with: php scripts/check-module-boundaries.php --update-baseline\n");
    exit(2);
}

$decoded = json_decode((string) file_get_contents($baselinePath), true);
if (! is_array($decoded) || ! is_array($decoded['edges'] ?? null)) {
    fwrite(STDERR, "Error: baseline file is not valid (missing \"edges\"): {$baselinePath}\n");
    exit(2);
}

if (isset($decoded['frozen_symbols']) && ! is_array($decoded['frozen_symbols'])) {
    fwrite(STDERR, "Error: \"frozen_symbols\" must be an object in: {$baselinePath}\n");
    exit(2);
}
$frozenBaseline = $decoded['frozen_symbols'] ?? [];

$currentFlat = $flatten($current);
$baselineFlat = $flatten($decoded['edges']);
$new = array_diff_key($currentFlat, $baselineFlat);
$stale = array_diff_key($baselineFlat, $currentFlat);

$newSymbols = [];
$staleSymbols = [];
foreach ($frozenBaseline as $edge => $listed) {
    if (isset($new[$edge]) || ! isset($currentFlat[$edge]) || ! is_array($listed)) {
        continue; // new/removed edges are reported as edges
    }
    foreach ($sources[$edge] as $occurrence) {
        if (! in_array($occurrence[4], $listed, true)) {
            $newSymbols[] = [$edge, $occurrence];
        }
    }
    foreach (array_diff($listed, $symbolsFor($edge)) as $symbol) {
        $staleSymbols[] = [$edge, $symbol];
    }
}

if ($new === [] && $stale === [] && $newSymbols === [] && $staleSymbols === []) {
    echo 'Module boundary guard: OK ('.$scanned.' PHP files, '.count($currentFlat)." edges)\n";
    exit(0);
}

if ($new !== []) {
    echo 'Module boundary guard: '.count($new)." new cross-module dependency edge(s) not in the baseline\n";
    foreach (array_keys($new) as $edge) {
        [$from, $to] = explode('>', $edge);
        echo "  {$from} -> {$to}\n";
        foreach ($sources[$edge] as [$path, $line, $category, $code]) {
            echo "    [{$category}] {$path}:{$line}: {$code}\n";
        }
    }
    echo "Remove the dependency (use an Events/contract seam), or get the edge reviewed and add it to the baseline.\n";
}

if ($stale !== []) {
    echo 'Module boundary guard: '.count($stale)." baseline edge(s) no longer exist (ratchet down)\n";
    foreach (array_keys($stale) as $edge) {
        echo '  '.str_replace('>', ' -> ', $edge)."\n";
    }
    echo "Run `php scripts/check-module-boundaries.php --update-baseline` (or `composer check-module-boundaries -- --update-baseline`) and commit scripts/module-boundaries.json.\n";
}

if ($newSymbols !== []) {
    echo 'Module boundary guard: '.count($newSymbols)." new symbol(s) on frozen edge(s)\n";
    foreach ($newSymbols as [$edge, [$path, $line, $category, $code, $fqcn]]) {
        echo '  '.str_replace('>', ' -> ', $edge).": new symbol on frozen edge: {$fqcn}\n";
        echo "    [{$category}] {$path}:{$line}: {$code}\n";
    }
    echo "Use an existing frozen symbol or remove the dependency; adding symbols needs review.\n";
}

if ($staleSymbols !== []) {
    echo 'Module boundary guard: '.count($staleSymbols)." frozen symbol(s) no longer referenced (ratchet down)\n";
    foreach ($staleSymbols as [$edge, $symbol]) {
        echo '  '.str_replace('>', ' -> ', $edge).": {$symbol}\n";
    }
    echo "Run `php scripts/check-module-boundaries.php --update-baseline` and commit scripts/module-boundaries.json.\n";
}

exit(1);
