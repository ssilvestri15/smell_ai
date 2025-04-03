import os
import subprocess
import pytest
import pandas as pd
import shutil

BASE_DIR = os.path.abspath("test/system_testing")

TEST_CASES = {
    # TC1 => NF=0 => errore percorso mancante
    # Config: ME=GUI => lo stiamo testando in CLI,
    # ma l'importante è che esca con errore perché manca l'input
    "TC1": {
        "expected_error": False,
        "expected_smells": 0,
        "description": "NF=0 => errore di percorso mancante.",
        # Parametri CLI
        "parallel": False,
        "max_walkers": 1,
        "resume": False,
        "multiple": False,
    },

    # TC2 => NF>1, EF=.py, 1 progetto annidato, NCS>1 => >=2,
    # indica che vogliamo "parallel = True" e "max_walkers" > 5
    "TC2": {
        "expected_error": False,
        "expected_smells": ">=2",
        "description": "NF>1 con API-specific => >=2 smell",
        "parallel": True,   # EP=true
        "max_walkers": 6,   # NW>5
        "resume": False,
        "multiple": False,  # NP=1 => single project (anche se annidato)
    },

    # TC3 => 1 file non leggibile => errore
    "TC3": {
        "expected_error": True,
        "expected_smells": 0,
        "description": "File non leggibile => errore.",
        "parallel": True,
        "max_walkers": 5,
        "resume": False,
        "multiple": False,
    },

    # TC4 => NF>1, EF=.py, NP>1, generico => NCS>1 => >=2,
    # EP=true, NW=5, nessun errore, resume=false
    "TC4": {
        "expected_error": False,
        "expected_smells": ">=2",
        "description": "Più file .py, generico => >=2 smell in multi-progetto",
        "parallel": True,
        "max_walkers": 5,
        "resume": False,
        "multiple": True,   # NP>1 => multiple
    },

    # TC5 => NF=1, progetto vuoto => 0 smell, CLI, EP=false => seq
    "TC5": {
        "expected_error": False,
        "expected_smells": 0,
        "description": "Progetto singolo e vuoto => 0 smell.",
        "parallel": False,
        "max_walkers": 1,
        "resume": False,
        "multiple": False,
    },

    # TC6 => NF>1 .py, 1 progetto annidato, 0 smell, EP=false => seq
    "TC6": {
        "expected_error": False,
        "expected_smells": 0,
        "description": "Più file .py, 0 smell, annidato => EP=false => seq",
        "parallel": False,
        "max_walkers": 1,
        "resume": False,
        "multiple": False,  # NP=1
    },

    # TC7 => NF=2, .py, 1 progetto annidato, NCS>1 => >=2, EP=false => seq
    "TC7": {
        "expected_error": False,
        "expected_smells": ">=2",
        "description": "Più code smells API-specific in un progetto annidato.",
        "parallel": False,
        "max_walkers": 1,
        "resume": False,
        "multiple": False,
    },

    # TC8 => NF>1, EF=.py, NP>1 => multiple, 0 smell, EP=true, NW=5
    "TC8": {
        "expected_error": False,
        "expected_smells": 0,
        "description": "Più progetti, 0 smell, parallel",
        "parallel": True,
        "max_walkers": 5,
        "resume": False,
        "multiple": True,   # NP>1
    },

    # TC9 => NF=2, EF=.py, NP=1, 1 smell generico => expected_smells=1
    # EP=true, NW=5
    "TC9": {
        "expected_error": False,
        "expected_smells": 1,
        "description": "Singolo smell generico in un progetto a directory singola.",
        "parallel": True,
        "max_walkers": 5,
        "resume": False,
        "multiple": False,
    },

    # TC10 => NF=2, EF=.py, NP=1, TCS=API-specific, NCS>1 => >=2,
    # EP=true, NW<5 => es. NW=3
    "TC10": {
        "expected_error": False,
        "expected_smells": ">=2",
        "description": "Progetto annidato con code smells API-specific multipli.",
        "parallel": True,
        "max_walkers": 3,   # NW<5
        "resume": False,
        "multiple": False,
    },

    # ================ TC11 ================
    # NF>1, EF=.py, NP>1, SD=simple, NCS=2 => TCS=API-specific, ME=CLI, EP=true, NW>5 => ERR=interruzione => RES=false
    # => Ci aspettiamo errore (interruzione) => returncode != 0
    "TC11": {
        "expected_error": True,      # interruzione => exit != 0
        "expected_smells": None,     # non c'è output finale
        "description": "Più file .py, NP>1, tool interrotto => errore",
        "parallel": True,           # EP=true
        "max_walkers": 6,           # NW>5 => es. 6
        "resume": False,
        "multiple": True,           # NP>1 => multiple
        "simulate_interrupt": True  # Simula l'interruzione
    },

    # ================ TC12 ================
    # NF>1, EF=.py, NP=1, SD=annidata, NCS>1 => TCS=altro, EP=true, NW<5 => nessun errore => RES=false
    # => Più file in un unico progetto annidato => >=2 smells
    "TC12": {
        "expected_error": False,
        "expected_smells": ">=2",    # NCS>1 => >=2
        "description": "Progetto annidato, TCS=altro => >=2 smell, no errore",
        "parallel": True,           # EP=true
        "max_walkers": 3,           # NW<5 => ad es. 3
        "resume": False,
        "multiple": False,          # NP=1
    },

    # ================ TC13 ================
    # NF>1, EF=.py, NP>1, SD=annidata, NCS=0 => ERR=file non leggibile =>
    # => expected_error=False, => no smells
    "TC13": {
        "expected_error": False,  # il tool NON fallisce se i file non si leggono
        "expected_smells": 0,     # nessuno smell, perché nessun file analizzato
        "description": "File non leggibili nei progetti annidati => 0 smell, ma nessun errore",
        "parallel": True,
        "max_walkers": 6,
        "resume": False,
        "multiple": True,
    },

    # ================ TC14 ================
    # NF=2, EF=.py, NP=1, SD=annidata, NCS=1 => TCS=API-specific => EP=true, NW=5 => no errore
    "TC14": {
        "expected_error": False,
        "expected_smells": 2,       # exactly 2 smell
        "description": "Progetto annidato, un solo code smell API-specific => 1",
        "parallel": True,
        "max_walkers": 5,
        "resume": False,
        "multiple": False,
    },

    # ================ TC15 ================
    # NF=2, EF=altro, NP=1, SD=semplice => NCS=0 => no errore =>
    # i file non .py vengono ignorati => 0 smell
    "TC15": {
        "expected_error": False,
        "expected_smells": 0,
        "description": "2 file con estensione non .py => ignorati, nessuno smell",
        "parallel": True,        # puoi scegliere se seq o parallel
        "max_walkers": 3,
        "resume": False,
        "multiple": False,
    },

    # ================ TC16 ================
    # NF>1, EF=.py, NP>1, SD=annidata, NCS>1 => TCS=altro, EP=true, NW=5 => ERR= interruzione => no output
    "TC16": {
        "expected_error": True,   # interruzione => exit != 0
        "expected_smells": None,  # no output finale
        "description": "Più file .py in progetti annidati, esecuzione interrotta => errore",
        "parallel": True,
        "max_walkers": 5,
        "resume": False,
        "multiple": True,
        "simulate_interrupt": True  # Simula l'interruzione
    },

    # ================ TC17 ================
    # NF>1, EF=.py, NP>1, SD=annidata, NCS=0 => file non leggibile => ERR= file non leggibile =>
    # => expected_error=False
    "TC17": {
        "expected_error": False,
        "expected_smells": None,
        "description": "Più file .py in progetti annidati, alcuni non leggibili => errore",
        "parallel": False,    # EP=false
        "max_walkers": 1,
        "resume": False,
        "multiple": True,
    },

    # ================ TC18 ================
    # NF>1, EF=.py, NP>1, SD=annidata, NCS=0 => no error => EP=true, NW=5
    "TC18": {
        "expected_error": False,
        "expected_smells": 0,
        "description": "Più file .py in multi-progetti annidati, 0 smell => no errore",
        "parallel": True,
        "max_walkers": 5,
        "resume": False,
        "multiple": True,
    },

    # ================ TC19 ================
    # NF>1, EF=.py, NP=1, SD=semplice, NCS>1 => TCS=altro => EP=true, NW=5 => no errore => >=2
    "TC19": {
        "expected_error": False,
        "expected_smells": ">=2",
        "description": "Progetto singolo (NP=1) a struttura semplice, NCS>1 => >=2. No errore",
        "parallel": True,
        "max_walkers": 5,
        "resume": False,
        "multiple": False,
    },

    # ================ TC20 ================
    # NF=2, EF=.py, NP=1, SD=annidata, NCS=2 => TCS=API-specific => EP=true, NW=5 => no errore => 1 smell
    "TC20": {
        "expected_error": False,
        "expected_smells": 2,
        "description": "Progetto annidato, 2 smell API-specific => 1. No errore",
        "parallel": True,
        "max_walkers": 5,
        "resume": False,
        "multiple": False,
    },

    # ================ TC21 ================
    # NF>1, EF=altro, NP>1, SD=annidata, NCS=0 => no errore =>
    # i file con estensione non supportata => 0 smell
    "TC21": {
        "expected_error": False,
        "expected_smells": 0,
        "description": "File con estensioni non .py in progetti annidati => nessuno smell",
        "parallel": True,
        "max_walkers": 6,  # NW>5 se vogliamo
        "resume": False,
        "multiple": True,
    },
}

def list_test_cases():
    """Restituisce solo le cartelle TC1..TC10 in system_testing/."""
    tc_subdirs = []

    for name in os.listdir(BASE_DIR):
        # Deve iniziare con "TC"
        if not name.startswith("TC"):
            continue

        # Proviamo a estrarre la parte numerica
        # (Es: 'TC4' -> 4, 'TC10' -> 10)
        try:
            tc_num = int(name[2:])  # slice dopo 'TC'
        except ValueError:
            continue  # se non riesce, ignora

        # Limitiamo a 1..10
        if 1 <= tc_num <= 21:
            path = os.path.join(BASE_DIR, name)
            if os.path.isdir(path):
                tc_subdirs.append((tc_num, name))

    # Ordiniamo secondo il valore numerico (quindi TC1, TC2, ... TC10)
    tc_subdirs.sort(key=lambda x: x[0])

    # Ritorniamo solo i nomi di cartella (tipo 'TC1', 'TC2', ...)
    return [item[1] for item in tc_subdirs]


@pytest.mark.parametrize("tc_dir", list_test_cases())
def test_system_case(tc_dir):
    """
    Esegue il test di sistema per la cartella tc_dir (es. 'TC2').
    Legge i parametri attesi da TEST_CASES[tc_dir].
    """
    tc_path = os.path.join(BASE_DIR, tc_dir)
    cfg = TEST_CASES.get(tc_dir, {})

    expected_error = cfg.get("expected_error", False)
    expected_smells = cfg.get("expected_smells", None)
    parallel = cfg.get("parallel", False)
    max_walkers = cfg.get("max_walkers", 5)
    resume = cfg.get("resume", False)
    multiple = cfg.get("multiple", False)

    # 1) Pulizia/creazione cartella output
    output_dir = os.path.join(tc_path, "output")
    if os.path.isdir(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir)

    # 2) Prepara il comando CLI
    cmd = [
        "python", "-m", "cli.cli_runner",
        "--input", tc_path,
        "--output", output_dir,
        "--max_walkers", str(max_walkers),
    ]
    if parallel:
        cmd.append("--parallel")
    if resume:
        cmd.append("--resume")
    if multiple:
        cmd.append("--multiple")

    # 3) Se va simulata un'interruzione, facciamolo qui e ritorniamo subito
    if cfg.get("simulate_interrupt", False):
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        proc.terminate()  # simula interruzione "manuale" (SIGTERM)
        stdout, stderr = proc.communicate()

        assert proc.returncode != 0, f"{tc_dir} doveva interrompersi"
        return


    # 4) Esegui normalmente
    result = subprocess.run(cmd, capture_output=True, text=True)

    # 5) Verifica
    if expected_error:
        # Se ci aspettiamo un errore, returncode != 0
        assert result.returncode != 0, (
            f"{tc_dir} doveva dare errore, invece exit=0. "
            f"Stderr:\n{result.stderr}"
        )
    else:
        # Altrimenti exit=0
        assert result.returncode == 0, (
            f"{tc_dir} doveva passare, invece exit={result.returncode}.\n"
            f"Stderr:\n{result.stderr}"
        )

        # Controlla se c'è `overview.csv` (tranne i casi di errore)
        overview_path = os.path.join(output_dir, "output", "overview.csv")

        if expected_smells == 0:
            # Se ci si aspetta 0 smell, il file potrebbe non essere stato generato
            assert not os.path.exists(overview_path), (
                f"{tc_dir}: attesi 0 smell, ma overview.csv è stato generato."
            )
        else:
            # In tutti gli altri casi il file DEVE esistere
            assert os.path.exists(overview_path), f"{tc_dir}: overview.csv mancante"

            # Se previsto un numero di smell, controlliamo
            if expected_smells is not None:
                df = pd.read_csv(overview_path)
                n_smells = len(df)
                if isinstance(expected_smells, int):
                    assert n_smells == expected_smells, (
                        f"{tc_dir}: attesi {expected_smells} smell, "
                        f"trovati {n_smells}"
                    )
                elif isinstance(expected_smells, str) and expected_smells.startswith(">="):
                    threshold = int(expected_smells.replace(">=", ""))
                    assert n_smells >= threshold, (
                        f"{tc_dir}: attesi >= {threshold} smell, trovati {n_smells}"
                    )
