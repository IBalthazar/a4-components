
function List({ assignments, isEditing, onEdit, onDelete }) {
    
    return (
        <ul className="list">
            {assignments.map(item => (
                <li key={item._id}>
                    <span>
                        {item.assignment} | {item.category} | {item.deadline} | {item.priority}
                    </span>
                    <button type="button" disabled={isEditing === item._id} onClick={() => onEdit(item)}>
                        Edit
                    </button>

                    <button type="button" onClick={() => onDelete(item._id)}>
                        Delete
                    </button>
                </li>
            ))}
        </ul>
    );
}
export default List;
