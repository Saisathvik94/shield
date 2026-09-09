"""SHIELD on-chain asset permission registry.

Compile with:
    python contracts/permission_registry.py

The contract stores one box per (asset database ID, wallet) permission.
The treasury account is the application administrator and relayer.
"""

from pathlib import Path
import importlib.metadata
import sys
import types

if "pkg_resources" not in sys.modules:
    pkg_resources = types.ModuleType("pkg_resources")
    pkg_resources.require = lambda name: [importlib.metadata.distribution(name)]
    sys.modules["pkg_resources"] = pkg_resources

from pyteal import App, Assert, Bytes, Cond, Int, Mode, Pop, Return, Seq, Txn, compileTeal


ADMIN_KEY = Bytes("admin")
GRANT_METHOD = Bytes("grant")
REVOKE_METHOD = Bytes("revoke")


def approval_program():
    on_create = Seq(
        App.globalPut(ADMIN_KEY, Txn.sender()),
        Int(1),
    )

    require_admin = Assert(Txn.sender() == App.globalGet(ADMIN_KEY))
    box_key = Txn.application_args[1]

    grant = Seq(
        require_admin,
        App.box_put(box_key, Bytes("1")),
        Int(1),
    )

    revoke = Seq(
        require_admin,
        Pop(App.box_delete(box_key)),
        Int(1),
    )

    return Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.application_args[0] == GRANT_METHOD, grant],
        [Txn.application_args[0] == REVOKE_METHOD, revoke],
    )


def clear_state_program():
    return Return(Int(1))


def main():
    output_dir = Path(__file__).parent
    approval = compileTeal(approval_program(), mode=Mode.Application, version=8)
    clear = compileTeal(clear_state_program(), mode=Mode.Application, version=8)
    (output_dir / "permission_approval.teal").write_text(approval + "\n", encoding="utf-8")
    (output_dir / "permission_clear.teal").write_text(clear + "\n", encoding="utf-8")
    print("Compiled permission_registry.py")
    print(f"Approval: {output_dir / 'permission_approval.teal'}")
    print(f"Clear: {output_dir / 'permission_clear.teal'}")


if __name__ == "__main__":
    main()
